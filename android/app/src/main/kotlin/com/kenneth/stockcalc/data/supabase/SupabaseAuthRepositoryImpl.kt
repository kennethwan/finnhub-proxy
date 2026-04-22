package com.kenneth.stockcalc.data.supabase

import com.kenneth.stockcalc.domain.repository.AuthRepository
import com.kenneth.stockcalc.domain.repository.AuthUser
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.SessionStatus
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class SupabaseAuthRepositoryImpl @Inject constructor(
    private val client: SupabaseClient,
) : AuthRepository {
    override val currentUser: Flow<AuthUser?> =
        client.auth.sessionStatus.map { status ->
            val session = (status as? SessionStatus.Authenticated)?.session
            session?.user?.let { AuthUser(id = it.id, email = it.email.orEmpty()) }
        }

    override suspend fun signIn(email: String, password: String): Result<Unit> = runCatching {
        client.auth.signInWith(Email) {
            this.email = email
            this.password = password
        }
    }

    override suspend fun signUp(email: String, password: String): Result<Unit> = runCatching {
        client.auth.signUpWith(Email) {
            this.email = email
            this.password = password
        }
    }

    override suspend fun signOut() {
        client.auth.signOut()
    }
}
