package com.zjx93.reach.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily

// 留白禅境 · 品牌锚点：对勾图标 + 「让每一天都有迹可循」
// 配色：墨色文字 + 静谧青绿强调 + 暖白底；标题用宋体带来书卷气
val Ink = Color(0xFF1C1C1A)
val Muted = Color(0xFF8A8A82)
val WarmWhite = Color(0xFFFAFAF8)
val MistGreen = Color(0xFFB9C2B0) // 完成态雾绿
val ZenTeal = Color(0xFF2F9E8F)   // 静谧青绿（主强调色）

private val LightColors = lightColorScheme(
    primary = ZenTeal,
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCEEEA),
    onPrimaryContainer = Color(0xFF0F3B34),
    secondary = Color(0xFF6B6A62),
    onSecondary = Color.White,
    background = WarmWhite,
    onBackground = Ink,
    surface = Color.White,
    onSurface = Ink,
    surfaceVariant = Color(0xFFF1F0EA),
    onSurfaceVariant = Color(0xFF6B6A62),
    outline = Color(0xFFE2E0D8),
    outlineVariant = Color(0xFFECECE6),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF5CC2B1),
    onPrimary = Color(0xFF05332C),
    primaryContainer = Color(0xFF0F3B34),
    onPrimaryContainer = Color(0xFFDCEEEA),
    secondary = Color(0xFF9AA0A8),
    onSecondary = Color(0xFF1A1A18),
    background = Color(0xFF14130F),
    onBackground = Color(0xFFEDEAE0),
    surface = Color(0xFF1E1C17),
    onSurface = Color(0xFFEDEAE0),
    surfaceVariant = Color(0xFF26241D),
    onSurfaceVariant = Color(0xFFB9B6AC),
    outline = Color(0xFF3A372F),
    outlineVariant = Color(0xFF2C2A22),
)

// 标题/大字号用宋体（书卷气），正文与标签保持无衬线
private val ReachTypography = Typography(
    displaySmall = Typography().displaySmall.copy(fontFamily = FontFamily.Serif),
    headlineMedium = Typography().headlineMedium.copy(fontFamily = FontFamily.Serif),
    headlineSmall = Typography().headlineSmall.copy(fontFamily = FontFamily.Serif),
    titleLarge = Typography().titleLarge.copy(fontFamily = FontFamily.Serif),
    titleMedium = Typography().titleMedium.copy(fontFamily = FontFamily.Serif),
)

@Composable
fun ReachTheme(
    darkTheme: Boolean = androidx.compose.foundation.isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = ReachTypography,
        content = content,
    )
}
