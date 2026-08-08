package dev.tomorrowtools.resume

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore("session")

class SessionStore(private val context: Context) {
    private val tokenKey = stringPreferencesKey("bearer_token")
    private val emailKey = stringPreferencesKey("email")

    val token: Flow<String?> = context.dataStore.data.map { it[tokenKey] }
    val email: Flow<String?> = context.dataStore.data.map { it[emailKey] }

    suspend fun save(token: String, email: String) {
        context.dataStore.edit {
            it[tokenKey] = token
            it[emailKey] = email
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
