import { useState } from "react";
import {
    useNavigate,
    useParams,
} from "react-router-dom";
import logo from "../../images/logo-stiqrhub-health.jpeg"
import { Eye, EyeOff } from "lucide-react";

interface ResetPasswordResponse {
    message: string;
}

interface ResetPasswordForm {
    new_password: string;
    confirm_password: string;
}

const ResetPassword = () => {
    const navigate = useNavigate();
    const { token } = useParams<{ token: string }>();

    const [formData, setFormData] =
        useState<ResetPasswordForm>({
            new_password: "",
            confirm_password: "",
        });

    const [showPassword, setShowPassword] =
        useState<boolean>(false);

    const [showConfirmPassword, setShowConfirmPassword] =
        useState<boolean>(false);

    const [loading, setLoading] =
        useState<boolean>(false);

    const [error, setError] =
        useState<string>("");

    const [success, setSuccess] =
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

    const validateForm = () => {
        if (!token) {
            return "Reset password token tidak ditemukan.";
        }

        if (!formData.new_password) {
            return "Password baru wajib diisi.";
        }

        if (formData.new_password.length < 8) {
            return "Password minimal 8 karakter.";
        }

        if (!formData.confirm_password) {
            return "Konfirmasi password wajib diisi.";
        }

        if (
            formData.new_password !==
            formData.confirm_password
        ) {
            return "Konfirmasi password tidak sesuai.";
        }

        return null;
    };

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>
    ) => {
        e.preventDefault();

        const validationError = validateForm();

        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/customer/reset-password/${token}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        new_password: formData.new_password,
                    }),
                }
            );

            const result: ResetPasswordResponse =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Gagal melakukan reset password."
                );
            }

            setSuccess(result.message);

            setFormData({
                new_password: "",
                confirm_password: "",
            });
        } catch (err) {
            console.error("Reset password error:", err);

            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(
                    "Terjadi kesalahan saat melakukan reset password."
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
                            Reset Password
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Create a new password for your StiqrHub
                            Health account.
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
                                You can now sign in using your new
                                password.
                            </p>
                        </div>
                    )}

                    {!success && (
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            {/* New Password */}
                            <div>
                                <label
                                    htmlFor="new_password"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    New Password
                                </label>

                                <div className="relative">
                                    <input
                                        id="new_password"
                                        name="new_password"
                                        type={
                                            showPassword
                                                ? "text"
                                                : "password"
                                        }
                                        value={formData.new_password}
                                        onChange={handleChange}
                                        placeholder="Enter new password"
                                        autoComplete="new-password"
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

                            {/* Confirm Password */}
                            <div>
                                <label
                                    htmlFor="confirm_password"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Confirm New Password
                                </label>

                                <div className="relative">
                                    <input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type={
                                            showConfirmPassword
                                                ? "text"
                                                : "password"
                                        }
                                        value={
                                            formData.confirm_password
                                        }
                                        onChange={handleChange}
                                        placeholder="Confirm new password"
                                        autoComplete="new-password"
                                        disabled={loading}
                                        className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (prev) => !prev
                                            )
                                        }
                                        className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-gray-700"
                                    >
                                        {showConfirmPassword
                                            ? <Eye />
                                            : <EyeOff />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !token}
                                className="cursor-pointer flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                            >
                                {loading ? (
                                    <>
                                        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Resetting...
                                    </>
                                ) : (
                                    "Reset Password"
                                )}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/customer/sign-in")
                            }
                            className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                        >
                            {success
                                ? "Continue to Sign In"
                                : "Back to Sign In"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;