import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface ProviderUser {
    id_provider_user: number;
    name_provider_user: string;
    email_provider_user: string;
    phone_provider_user: string;
    status_provider_user: string;
    id_provider: number;
    id_provider_role: number;
    name_provider_role: string;
}

interface SignInResponse {
    message: string;
    provider_user: ProviderUser;
    token: string;
}

interface SignInForm {
    email_provider_user: string;
    password_provider_user: string;
}

const SignIn = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<SignInForm>({
        email_provider_user: "",
        password_provider_user: "",
    });

    const [showPassword, setShowPassword] =
        useState<boolean>(false);

    const [loading, setLoading] =
        useState<boolean>(false);

    const [error, setError] =
        useState<string>("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        if (!formData.email_provider_user.trim()) {
            setError("Email wajib diisi.");
            return;
        }

        if (!formData.password_provider_user) {
            setError("Password wajib diisi.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/provider-user/sign-in`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email_provider_user:
                            formData.email_provider_user.trim(),
                        password_provider_user:
                            formData.password_provider_user,
                    }),
                }
            );

            const result: SignInResponse =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Email atau password yang Anda masukkan salah."
                );
            }

            // Simpan JWT Provider User
            sessionStorage.setItem("provider_token", result.token);

            // Simpan informasi Provider User
            localStorage.setItem("provider_user_data", JSON.stringify(result.provider_user));

            console.log("Provider login successful:", result);

            navigate("/provider/dashboard");
        } catch (err) {
            console.error(
                "Provider sign in error:",
                err
            );

            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(
                    "Terjadi kesalahan saat melakukan sign in."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Provider Sign In
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            Sign in to manage your StiqrHub Health
                            provider account
                        </p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-sm text-red-600">
                                {error}
                            </p>
                        </div>
                    )}

                    {/* Form */}
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email_provider_user"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Email
                            </label>

                            <input
                                id="email_provider_user"
                                name="email_provider_user"
                                type="email"
                                value={
                                    formData.email_provider_user
                                }
                                onChange={handleChange}
                                placeholder="Enter your email"
                                autoComplete="email"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label
                                    htmlFor="password_provider_user"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>

                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            "/provider/forgot-password"
                                        )
                                    }
                                    className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <div className="relative">
                                <input
                                    id="password_provider_user"
                                    name="password_provider_user"
                                    type={
                                        showPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={
                                        formData.password_provider_user
                                    }
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(
                                            (prev) => !prev
                                        )
                                    }
                                    className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword
                                        ? <Eye />
                                        : <EyeOff />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="cursor-pointer flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
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

                    {/* Sign Up */}
                    <div className="border-t border-gray-100 pt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have a provider account?
                        </p>

                        <button
                            type="button"
                            onClick={() => navigate("/provider/sign-up")}
                            className="mt-2 cursor-pointer text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
                        >
                            Sign Up as Provider
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;