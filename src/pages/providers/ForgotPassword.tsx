
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo-stiqrhub-health.jpeg";

interface ForgotPasswordResponse {
    message?: string;
    success?: boolean;
}

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading) return;

        if (!email.trim()) {
            setError("Email is required.");
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email.trim())) {
            setError("Please enter a valid email address.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/provider-user/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        email_provider_user: email.trim().toLowerCase(),
                    }),
                }
            );

            const result: ForgotPasswordResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message || "Failed to send password reset link."
                );
            }

            setSuccess(
                result.message ||
                "If the email is registered, a password reset link will be sent."
            );
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "An error occurred while sending the reset link."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                    <img
                        className="m-auto h-20 w-20 object-contain"
                        src={logo}
                        alt="StiqrHub Health Logo"
                    />

                    {/* HEADER */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Forgot Password?
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Enter your registered email address and we'll
                            send you a link to reset your password.
                        </p>
                    </div>

                    {/* ERROR */}
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

                    {/* SUCCESS */}
                    {success && (
                        <div
                            role="status"
                            className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3"
                        >
                            <p className="text-sm text-green-700">
                                {success}
                            </p>

                            <p className="mt-1 text-xs text-green-600">
                                Please check your inbox and follow the link
                                provided to create a new password.
                            </p>
                        </div>
                    )}

                    {/* FORM */}
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                        noValidate
                    >
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
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);

                                    if (error) setError("");
                                    if (success) setSuccess("");
                                }}
                                placeholder="Enter your email"
                                autoComplete="email"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                            {loading ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Sending...
                                </>
                            ) : (
                                "Send Reset Link"
                            )}
                        </button>
                    </form>

                    {/* BACK TO SIGN IN */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => navigate("/provider/sign-in")}
                            className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            Back to Sign In
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
