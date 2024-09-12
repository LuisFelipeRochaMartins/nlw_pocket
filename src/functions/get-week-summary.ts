import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import { goalCompletions, goals } from '../db/schema'
import dayjs from 'dayjs'

export async function getWeekSummary() {
  const lastDayWeek = dayjs().endOf('week').toDate()
  const firstDayWeek = dayjs().startOf('week').toDate()

  const goalsCreatedUpToWeek = db.$with('goals_created_up_to_week').as(
    db
      .select({
        id: goals.id,
        title: goals.title,
        desiredWeeklyFrequency: goals.desiredWeeklyFrequency,
        createdAt: goals.createdAt,
      })
      .from(goals)
      .where(lte(goals.createdAt, lastDayWeek))
  )

  const goalCompletionsInWeek = db.$with('goal_completions_count').as(
    db
      .select({
        id: goalCompletions.id,
        title: goals.title,
        completedAt: sql`
          DATE(@{goalComletions.createdAt})
        `.as('completedAtDate'),
      })
      .from(goalCompletions)
      .innerJoin(goals, eq(goals.id, goalCompletions.goalId))
      .where(
        and(
          gte(goalCompletions.createdAt, firstDayWeek),
          lte(goalCompletions.createdAt, lastDayWeek)
        )
      )
      .groupBy(goalCompletions.goalId)
  )

  const goalsCompletedByWeekDay = db.$with('goals_completed_by_week_day').as(
    db
      .select({
        completedAtDate: goalCompletionsInWeek.completedAt,
        completions: sql`
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ${goalCompletionsInWeek.id},
              'title', ${goalCompletionsInWeek.title},
              'completedAt', ${goalCompletionsInWeek.completedAt}
            )
          )
        `.as('completions'),
      })
      .from(goalCompletionsInWeek)
      .groupBy(goalCompletionsInWeek.completedAt)
  )

  const result = db
    .with(goalsCreatedUpToWeek, goalCompletionsInWeek, goalsCompletedByWeekDay)
    .select({
      completed: sql`(SELECT COUNT(*) FROM ${goalCompletionsInWeek})`.mapWith(
        Number
      ),
      total:
        sql`(SELECT SUM(${goalsCreatedUpToWeek.desiredWeeklyFrequency}) FROM ${goalsCreatedUpToWeek})`.mapWith(
          Number
        ),
      goalsPerDay: sql`JSON_OBJECT_AGG(
        ${goalsCompletedByWeekDay.completedAtDate},
        ${goalsCompletedByWeekDay.completions}
      )`,
    })
    .from(goalsCompletedByWeekDay)

  return {
    summary: result,
  }
}
