import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import logo from "../../images/logo-stiqrhub-health.jpeg";

interface User {
    id_user: number | string;
    name_user: string;
    email_user: string;
    status_user: string;
    id_user_role: number | string;
}

interface SignInResponse {
    message: string;
    user?: User;
    token?: string;
}

interface UserRole {
    id_user_role: number | string;
    name_user_role: string;
}

interface UserRolesResponse {
    success: boolean;
    data?: UserRole[];
    message?: string;
}

interface SignInForm {
    email_user: string;
    password_user: string;
}

const SignIn = () => {
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState<SignInForm>({
        email_user: "",
        password_user: "",
    });

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const fetchUserRoles = async (
        token: string
    ): Promise<UserRole[]> => {
        const response = await fetch(
            `${import.meta.env.VITE_API_URI}/user-role/get-all`,
            {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        if (!response.ok) {
            throw new Error(
                "Gagal mengambil data user role dari server."
            );
        }

        const result: UserRolesResponse = await response.json();

        if (!result.success || !Array.isArray(result.data)) {
            throw new Error(
                result.message ||
                "Data user role yang diterima tidak valid."
            );
        }

        return result.data;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading) return;

        const email = formData.email_user.trim();
        const password = formData.password_user;

        // Validate Email
        if (!email) {
            setError("Email wajib diisi.");
            return;
        }

        // Validate Password
        if (!password) {
            setError("Password wajib diisi.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/user/sign-in`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        email_user: email,
                        password_user: password,
                    }),
                }
            );

            let result: SignInResponse;

            try {
                result = await response.json();
            } catch {
                throw new Error(
                    "Server memberikan respons login yang tidak valid."
                );
            }

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Email atau password yang Anda masukkan salah."
                );
            }

            if (!result.token || !result.user) {
                throw new Error(
                    "Login berhasil, tetapi data autentikasi tidak lengkap."
                );
            }

            if (result.user.status_user !== "ACTIVE") {
                throw new Error(
                    "Akun Anda tidak aktif. Silakan hubungi administrator."
                );
            }

            const userRoles = await fetchUserRoles(result.token);

            const currentRole = userRoles.find(
                (role) =>
                    String(role.id_user_role) ===
                    String(result.user?.id_user_role)
            );

            if (!currentRole) {
                throw new Error(
                    "Role pengguna tidak ditemukan dalam sistem."
                );
            }

            sessionStorage.setItem(
                "admin_token",
                result.token
            );

            localStorage.setItem(
                "admin_user",
                JSON.stringify(result.user)
            );

            localStorage.setItem(
                "admin_role",
                JSON.stringify(currentRole)
            );

            navigate("/user/dashboard");
        } catch (err) {
            setError(
                err instanceof TypeError
                    ? "Tidak dapat terhubung ke server. Periksa koneksi dan konfigurasi API."
                    : err instanceof Error
                        ? err.message
                        : "Terjadi kesalahan saat melakukan sign in."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
            <div className="w-full max-w-md">
                {/* Sign In Card */}
                <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <img
                            src={logo}
                            alt="STIQR Hub Health"
                            className="mx-auto mb-5 h-20 w-20 object-contain"
                        />

                        <h1 className="text-2xl font-semibold text-[#00357A]">
                            Sign In
                        </h1>

                        <p className="mt-2 text-sm leading-relaxed text-gray-500">
                            Sign in to access your STIQR Hub Health
                            dashboard
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div
                            role="alert"
                            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                        >
                            <p className="text-sm text-red-600">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Sign In Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email_user"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Email
                            </label>

                            <input
                                id="email_user"
                                name="email_user"
                                type="email"
                                value={formData.email_user}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                autoComplete="username"
                                required
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password_user"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    id="password_user"
                                    name="password_user"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={formData.password_user}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    required
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-14 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />

                                {/* Show / Hide Password */}
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    disabled={loading}
                                    aria-label={
                                        showPassword
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed"
                                >
                                    {showPassword ? (
                                        <Eye size={20} />
                                    ) : (
                                        <EyeOff size={20} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-[#0866D8] px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-[#B7CAE4]"
                        >
                            {loading ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Signing in...
                                </>
                            ) : (
                                "Sign In"
                            )}
                        </button>
                    </form>

                    {/* Security Information */}
                    <div className="mt-6 border-t border-gray-100 pt-6">
                        <div className="flex items-center justify-center gap-2 text-gray-400">
                            <ShieldCheck size={16} />

                            <p className="text-xs">
                                Secure access for authorized users
                            </p>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <p className="mt-6 text-center text-xs text-gray-400">
                    © {new Date().getFullYear()} STIQR Hub Health.
                    All rights reserved.
                </p>
            </div>
        </div>
    );
};

export default SignIn;
