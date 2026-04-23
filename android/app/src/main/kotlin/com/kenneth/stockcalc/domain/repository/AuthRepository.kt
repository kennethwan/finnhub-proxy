package com.kenneth.stockcalc.domain.repository

import kotlinx.coroutines.flow.Flow

data class AuthUser(val id: String, val email: String)

interface AuthRepository {
    val currentUser: Flow<AuthUser?>
    suspend fun signIn(email: String, password: String): Result<Unit>
    suspend fun signUp(email: String, password: String): Result<Unit>
    suspend fun signOut()
}
