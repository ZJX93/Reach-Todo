package com.zjx93.reach.data.model

import com.google.gson.annotations.SerializedName

/** 与后端 schemas.py 一一对应的数据类（snake_case 用 @SerializedName 映射）。
 *  日期/时间统一用 String，UI 层再格式化，避免 Gson 类型适配器复杂度。 */

data class UserOut(
    val id: Int = 0,
    val username: String = "",
    val email: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
)

data class TokenOut(
    @SerializedName("access_token") val accessToken: String = "",
    @SerializedName("token_type") val tokenType: String = "bearer",
    val user: UserOut? = null,
)

data class UserCreate(
    val username: String,
    val email: String? = null,
    val password: String,
)

data class UserUpdate(
    val email: String? = null,
)

data class PasswordChange(
    @SerializedName("old_password") val oldPassword: String,
    @SerializedName("new_password") val newPassword: String,
)

data class CategoryOut(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val name: String = "",
    val color: String = "#3B82F6",
    val icon: String = "📁",
    @SerializedName("sort_order") val sortOrder: Int = 0,
)

data class GoalOut(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val title: String = "",
    val description: String? = null,
    val deadline: String? = null,
    val status: String = "active",
    @SerializedName("created_at") val createdAt: String? = null,
)

data class GoalCreate(
    val title: String,
    val description: String? = null,
    val deadline: String? = null,
)

data class GoalUpdate(
    val title: String? = null,
    val description: String? = null,
    val deadline: String? = null,
    val status: String? = null,
)

data class GoalBoardItem(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val title: String = "",
    val description: String? = null,
    val deadline: String? = null,
    val status: String = "active",
    @SerializedName("created_at") val createdAt: String? = null,
    val total: Int = 0,
    val done: Int = 0,
    val overdue: Int = 0,
    val progress: Int = 0,
)

data class TaskOut(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("category_id") val categoryId: Int = 0,
    @SerializedName("goal_id") val goalId: Int? = null,
    @SerializedName("parent_id") val parentId: Int? = null,
    val title: String = "",
    val note: String? = null,
    val priority: String = "normal",
    val importance: String = "normal",
    val recurrence: String = "none",
    val status: String = "todo",
    @SerializedName("due_date") val dueDate: String? = null,
    @SerializedName("due_time") val dueTime: String? = null,
    @SerializedName("sort_order") val sortOrder: Int = 0,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("completed_at") val completedAt: String? = null,
    @SerializedName("category_name") val categoryName: String? = null,
    @SerializedName("category_color") val categoryColor: String? = null,
    @SerializedName("category_icon") val categoryIcon: String? = null,
    @SerializedName("goal_title") val goalTitle: String? = null,
)

data class TaskCreate(
    val title: String,
    @SerializedName("category_id") val categoryId: Int,
    @SerializedName("goal_id") val goalId: Int? = null,
    @SerializedName("parent_id") val parentId: Int? = null,
    val note: String? = null,
    val priority: String = "normal",
    val importance: String = "normal",
    val recurrence: String = "none",
    @SerializedName("due_date") val dueDate: String? = null,
    @SerializedName("due_time") val dueTime: String? = null,
)

data class TaskUpdate(
    val title: String? = null,
    @SerializedName("category_id") val categoryId: Int? = null,
    @SerializedName("goal_id") val goalId: Int? = null,
    @SerializedName("parent_id") val parentId: Int? = null,
    val note: String? = null,
    val priority: String? = null,
    val importance: String? = null,
    val recurrence: String? = null,
    val status: String? = null,
    @SerializedName("due_date") val dueDate: String? = null,
    @SerializedName("due_time") val dueTime: String? = null,
)

data class FocusSessionOut(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("task_id") val taskId: Int? = null,
    val minutes: Int = 25,
    @SerializedName("started_at") val startedAt: String? = null,
)

data class FocusSessionCreate(
    @SerializedName("task_id") val taskId: Int? = null,
    val minutes: Int = 25,
)

data class RecordOut(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    val type: String = "diary",
    val title: String = "",
    val content: String? = null,
    val mood: String? = null,
    val tags: String? = null,
    @SerializedName("book_title") val bookTitle: String? = null,
    @SerializedName("book_author") val bookAuthor: String? = null,
    val project: String? = null,
    @SerializedName("record_date") val recordDate: String = "",
    @SerializedName("record_time") val recordTime: String? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
)

data class RecordCreate(
    val type: String = "diary",
    val title: String? = null,
    val content: String? = null,
    val mood: String? = null,
    val tags: String? = null,
    @SerializedName("book_title") val bookTitle: String? = null,
    @SerializedName("book_author") val bookAuthor: String? = null,
    val project: String? = null,
    @SerializedName("record_date") val recordDate: String? = null,
    @SerializedName("record_time") val recordTime: String? = null,
    @SerializedName("template_id") val templateId: Int? = null,
)

data class RecordUpdate(
    val type: String? = null,
    val title: String? = null,
    val content: String? = null,
    val mood: String? = null,
    val tags: String? = null,
    @SerializedName("book_title") val bookTitle: String? = null,
    @SerializedName("book_author") val bookAuthor: String? = null,
    val project: String? = null,
    @SerializedName("record_date") val recordDate: String? = null,
    @SerializedName("record_time") val recordTime: String? = null,
)

data class CalendarDay(
    val date: String = "",
    val total: Int = 0,
    val diary: Int = 0,
    val worklog: Int = 0,
    val note: Int = 0,
    val tasks: Int = 0,
)

data class TemplateOut(
    val id: Int = 0,
    @SerializedName("user_id") val userId: Int? = null,
    val type: String = "diary",
    val name: String = "",
    val icon: String = "📄",
    val content: String? = null,
    @SerializedName("is_preset") val isPreset: Boolean = false,
)

data class StatsSummary(
    @SerializedName("total_todo") val totalTodo: Int = 0,
    @SerializedName("total_done") val totalDone: Int = 0,
    @SerializedName("week_completed") val weekCompleted: Int = 0,
    val streak: Int = 0,
    @SerializedName("per_category") val perCategory: List<CategoryStat> = emptyList(),
    @SerializedName("goals_progress") val goalsProgress: List<GoalProgress> = emptyList(),
    @SerializedName("focus_minutes_today") val focusMinutesToday: Int = 0,
    @SerializedName("focus_minutes_week") val focusMinutesWeek: Int = 0,
)

data class CategoryStat(
    val name: String = "",
    val color: String = "#3B82F6",
    val icon: String = "📁",
    val todo: Int = 0,
    val done: Int = 0,
)

data class GoalProgress(
    val id: Int = 0,
    val title: String = "",
    val total: Int = 0,
    val done: Int = 0,
    val progress: Int = 0,
)

/** /api/lunar 返回 apihz 原始黄历字段，按需取用。 */
data class LunarInfo(
    val nyue: String? = null,
    val nri: String? = null,
    val jieqi: String? = null,
    @SerializedName("JIEQIDAYS") val jieqiDays: String? = null,
    val jieri: String? = null,
    val nnian: String? = null,
    @SerializedName("YEARGANZHI") val yearGanzhi: String? = null,
    val shengxiao: String? = null,
)

data class HolidayInfo(
    val name: String? = null,
    @SerializedName("isOffDay") val isOffDay: Boolean = false,
)

data class OkResponse(
    val ok: Boolean = false,
)
