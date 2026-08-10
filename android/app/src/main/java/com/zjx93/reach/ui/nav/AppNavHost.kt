package com.zjx93.reach.ui.nav

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.zjx93.reach.data.remote.Session
import com.zjx93.reach.ui.auth.LoginScreen
import com.zjx93.reach.ui.auth.RegisterScreen
import com.zjx93.reach.ui.main.MainScaffold

@Composable
fun AppNavHost(nav: NavHostController) {
    val start = if (Session.token.isNotEmpty()) Routes.MAIN else Routes.LOGIN
    NavHost(nav, startDestination = start) {
        composable(Routes.LOGIN) { LoginScreen(nav) }
        composable(Routes.REGISTER) { RegisterScreen(nav) }
        composable(Routes.MAIN) { MainScaffold(rootNav = nav) }
    }
}
