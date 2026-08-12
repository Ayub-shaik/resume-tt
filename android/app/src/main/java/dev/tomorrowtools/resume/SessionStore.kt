package dev.tomorrowtools.resume

import android.content.Context
import android.content.SharedPreferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

private val Context.legacySessionDataStore by preferencesDataStore("session")

/**
 * Keystore-backed session storage (EncryptedSharedPreferences).
 * Migrates once from the legacy plaintext DataStore and clears it.
 */
class SessionStore(private val context: Context) {
    private val prefs: SharedPreferences = createSecurePrefs(context)
    private val mutex = Mutex()
    private var migrated = false

    private val _token = MutableStateFlow(prefs.getString(KEY_TOKEN, null))
    private val _email = MutableStateFlow(prefs.getString(KEY_EMAIL, null))

    val token: Flow<String?> = _token.asStateFlow()
    val email: Flow<String?> = _email.asStateFlow()

    suspend fun save(token: String, email: String) {
        mutex.withLock {
            migrateLegacyLocked()
            prefs.edit()
                .putString(KEY_TOKEN, token)
                .putString(KEY_EMAIL, email)
                .apply()
            _token.value = token
            _email.value = email
        }
    }

    suspend fun clear() {
        mutex.withLock {
            migrateLegacyLocked()
            prefs.edit().clear().apply()
            _token.value = null
            _email.value = null
        }
    }

    /** Call on cold start so Flows reflect migrated legacy tokens. */
    suspend fun ensureMigrated() {
        mutex.withLock { migrateLegacyLocked() }
    }

    private suspend fun migrateLegacyLocked() {
        if (migrated) return
        migrated = true
        if (prefs.getString(KEY_TOKEN, null) != null) {
            // Already on secure store — still clear any leftover plaintext prefs.
            clearLegacyDataStore()
            return
        }
        val legacyTokenKey = stringPreferencesKey("bearer_token")
        val legacyEmailKey = stringPreferencesKey("email")
        val legacy = context.legacySessionDataStore.data.first()
        val legacyToken = legacy[legacyTokenKey]
        val legacyEmail = legacy[legacyEmailKey]
        if (!legacyToken.isNullOrBlank()) {
            prefs.edit()
                .putString(KEY_TOKEN, legacyToken)
                .putString(KEY_EMAIL, legacyEmail)
                .apply()
            _token.value = legacyToken
            _email.value = legacyEmail
        }
        clearLegacyDataStore()
    }

    private suspend fun clearLegacyDataStore() {
        try {
            context.legacySessionDataStore.edit { it.clear() }
        } catch (_: Exception) {
            // Ignore missing/corrupt legacy store
        }
    }

    companion object {
        private const val PREFS_NAME = "secure_session"
        private const val KEY_TOKEN = "bearer_token"
        private const val KEY_EMAIL = "email"

        private fun createSecurePrefs(context: Context): SharedPreferences {
            val masterKey = MasterKey.Builder(context)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            return EncryptedSharedPreferences.create(
                context,
                PREFS_NAME,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
            )
        }
    }
}
