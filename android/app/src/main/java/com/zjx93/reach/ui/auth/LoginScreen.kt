package com.zjx93.reach.ui.auth

import com.zjx93.reach.R
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import com.zjx93.reach.data.local.UserPrefs
import kotlinx.coroutines.launch
import com.zjx93.reach.ui.nav.Routes
import com.zjx93.reach.ui.theme.BrandGradient
import com.zjx93.reach.viewmodel.AuthViewModel

@Composable
fun LoginScreen(nav: NavHostController) {
    val vm: AuthViewModel = viewModel()
    val state by vm.state.collectAsState()

    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }

    val scope = rememberCoroutineScope()
    val serverUrl by UserPrefs.serverUrlFlow.collectAsState(initial = "http://192.168.9.3:8000")
    var urlText by remember(serverUrl) { mutableStateOf(serverUrl) }

    LaunchedEffect(state.user) {
        if (state.user != null) {
            nav.navigate(Routes.MAIN) { popUpTo(Routes.LOGIN) { inclusive = true } }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BrandGradient)
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.height(72.dp))
        Text("抵达 Reach", style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onPrimary)
        Text("让每一天都有迹可循", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.85f))
        Spacer(Modifier.height(32.dp))

        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = MaterialTheme.shapes.large,
            tonalElevation = 4.dp,
        ) {
            Column(modifier = Modifier.padding(20.dp)) {
                OutlinedTextField(
                    value = urlText, onValueChange = { urlText = it },
                    label = { Text("服务器地址") }, singleLine = true,
                    placeholder = { Text("http://192.168.9.3:8000") },
                    leadingIcon = { Icon(painter = painterResource(R.drawable.ic_brand), contentDescription = null) },
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = username, onValueChange = { username = it },
                    label = { Text("用户名") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedTextField(
                    value = password, onValueChange = { password = it },
                    label = { Text("密码") }, singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    modifier = Modifier.fillMaxWidth(),
                )
                state.error?.let {
                    Spacer(Modifier.height(8.dp))
                    Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                }
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = {
                        scope.launch {
                            UserPrefs.setServerUrl(urlText.trim().trimEnd('/'))
                            vm.login(username, password) {}
                        }
                    },
                    enabled = !state.loading,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    if (state.loading) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    else Text("登录")
                }
                Spacer(Modifier.height(8.dp))
                TextButton(onClick = { nav.navigate(Routes.REGISTER) }, modifier = Modifier.fillMaxWidth()) {
                    Text("没有账号？去注册")
                }
            }
        }
    }
}
