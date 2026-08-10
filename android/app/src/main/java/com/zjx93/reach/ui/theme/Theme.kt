package com.zjx93.reach.ui.theme

import androidx.compose.ui.graphics.Brush
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val BrandBlue = Color(0xFF2563EB)
val BrandCyan = Color(0xFF06B6D4)
val BrandTeal = Color(0xFF14B8A6)

val BrandGradient = Brush.horizontalGradient(listOf(BrandBlue, BrandCyan, BrandTeal))

private val LightColors = lightColorScheme(
    primary = BrandBlue,
    secondary = BrandCyan,
    tertiary = BrandTeal,
    background = Color(0xFFF8FAFC),
    surface = Color(0xFFFFFFFF),
    surfaceVariant = Color(0xFFEEF2F7),
    onPrimary = Color.White,
    onBackground = Color(0xFF0F172A),
    onSurface = Color(0xFF0F172A),
)

private val DarkColors = darkColorScheme(
    primary = BrandCyan,
    secondary = BrandBlue,
    tertiary = BrandTeal,
    background = Color(0xFF0B1220),
    surface = Color(0xFF111C2E),
    surfaceVariant = Color(0xFF1B2A40),
    onPrimary = Color(0xFF04121F),
    onBackground = Color(0xFFE2E8F0),
    onSurface = Color(0xFFE2E8F0),
)

@Composable
fun ReachTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
