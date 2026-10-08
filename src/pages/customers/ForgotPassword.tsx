import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo-stiqrhub-health.jpeg"

interface ForgotPasswordResponse {
    message: string;
}

const ForgotPassword = () => {
    const navigate = useNavigate();

    const [email, setEmail] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        if (!email.trim()) {
            setError("Email wajib diisi.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/customer/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email_customer: email.trim(),
                    }),
                }
            );

            const result: ForgotPasswordResponse =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Gagal mengirim link reset password."
                );
            }

            setSuccess(result.message);
        } catch (err) {
            console.error("Forgot password error:", err);

            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(
                    "Terjadi kesalahan saat mengirim link reset password."
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
                    <img className="h-20 w-20 m-auto" src={logo} alt="Logo" />

                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Forgot Password?
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Enter your registered email address and we'll
                            send you a link to reset your password.
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

                    {/* Success */}
                    {success && (
                        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                            <p className="text-sm text-green-700">
                                {success}
                            </p>

                            <p className="mt-1 text-xs text-green-600">
                                Please check your inbox and follow the link
                                provided to create a new password.
                            </p>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        <div>
                            <label
                                htmlFor="email_customer"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Email
                            </label>

                            <input
                                id="email_customer"
                                name="email_customer"
                                type="email"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);

                                    if (error) {
                                        setError("");
                                    }
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
                            className="cursor-pointer flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
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

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/customer/sign-in")
                            }
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