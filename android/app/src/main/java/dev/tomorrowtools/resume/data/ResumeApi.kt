package dev.tomorrowtools.resume.data

import kotlinx.serialization.json.JsonObject
import okhttp3.MultipartBody
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Query

interface ResumeApi {
    @POST("api/auth/mobile")
    suspend fun mobileAuth(@Body body: MobileAuthRequest): MobileAuthResponse

    @POST("api/auth/mobile/password")
    suspend fun passwordAuth(@Body body: PasswordAuthRequest): MobileAuthResponse

    @GET("api/resumes")
    suspend fun listResumes(): ResumesPayload

    @POST("api/ats/jd")
    suspend fun fetchJd(@Body body: JdRequest): JdPayload

    @POST("api/ats/analyze")
    suspend fun analyze(@Body body: AnalyzeRequest): AnalyzePayload

    @POST("api/ats/tailor")
    suspend fun tailor(@Body body: TailorRequest): TailorPayload

    @POST("api/ats/ask")
    suspend fun ask(@Body body: AskRequest): AskPayload

    @POST("api/ats/career-brand")
    suspend fun careerBrand(@Body body: BrandRequest): BrandPayload

    @GET("api/ats/templates")
    suspend fun templates(): TemplatesPayload

    @POST("api/ats/structure")
    suspend fun structure(@Body body: StructureRequest): StructurePayload

    @GET("api/ats/sessions")
    suspend fun listSessions(): SessionsPayload

    @GET("api/ats/sessions")
    suspend fun getSession(@Query("id") id: String): SessionPayload

    @POST("api/ats/sessions")
    suspend fun writeSession(@Body body: SessionWrite): SessionPayload

    @Multipart
    @POST("api/resumes/parse")
    suspend fun parseResume(@Part file: MultipartBody.Part): ParseTextPayload
}
