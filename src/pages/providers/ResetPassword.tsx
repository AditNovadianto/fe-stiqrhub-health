
import {
    useState,
    type ChangeEvent,
    type FormEvent,
} from "react";

import {
    useNavigate,
    useParams,
} from "react-router-dom";

import { Eye, EyeOff } from "lucide-react";

import logo from "../../images/logo-stiqrhub-health.jpeg";

interface ResetPasswordResponse {
    message?: string;
    success?: boolean;
}

interface ResetPasswordForm {
    new_password: string;
    confirm_password: string;
}

const ResetPassword = () => {
    const navigate = useNavigate();
    const { token } = useParams<{ token: string }>();

    const [formData, setFormData] = useState<ResetPasswordForm>({
        new_password: "",
        confirm_password: "",
    });

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");
    const [success, setSuccess] = useState<string>("");

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

    const validateForm = (): string | null => {
        if (!token) {
            return "Reset password token was not found.";
        }

        if (!formData.new_password) {
            return "New password is required.";
        }

        if (formData.new_password.length < 8) {
            return "Password must contain at least 8 characters.";
        }

        if (!formData.confirm_password) {
            return "Password confirmation is required.";
        }

        if (
            formData.new_password !==
            formData.confirm_password
        ) {
            return "Password confirmation does not match.";
        }

        return null;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (loading || success) return;

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
                `${import.meta.env.VITE_API_URI}/provider-user/reset-password/${token}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        new_password: formData.new_password,
                    }),
                }
            );

            const result: ResetPasswordResponse = await response
                .json()
                .catch(() => ({}));

            if (!response.ok || result.success === false) {
                throw new Error(
                    result.message ||
                    "Failed to reset password. The link may be invalid or expired."
                );
            }

            setSuccess(
                result.message ||
                "Password has been reset successfully."
            );

            setFormData({
                new_password: "",
                confirm_password: "",
            });
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "An error occurred while resetting your password."
            );
        } finally {
            setLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100";

    const labelClass =
        "mb-2 block text-sm font-medium text-gray-700";

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                    {/* LOGO */}
                    <img
                        className="m-auto h-20 w-20 object-contain"
                        src={logo}
                        alt="StiqrHub Health Logo"
                    />

                    {/* HEADER */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Reset Password
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-gray-500">
                            Create a new password for your StiqrHub
                            Health account.
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
                                You can now sign in using your new
                                password.
                            </p>
                        </div>
                    )}

                    {!token && !success && (
                        <div
                            role="alert"
                            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
                        >
                            <p className="text-sm text-amber-700">
                                Invalid reset password link. Please request
                                a new link.
                            </p>

                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/provider/forgot-password")
                                }
                                className="mt-2 cursor-pointer text-sm font-semibold text-blue-600 hover:underline"
                            >
                                Request New Link
                            </button>
                        </div>
                    )}

                    {/* RESET PASSWORD FORM */}
                    {!success && token && (
                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                            noValidate
                        >
                            {/* NEW PASSWORD */}
                            <div>
                                <label
                                    htmlFor="new_password"
                                    className={labelClass}
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
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(
                                                (prev) => !prev
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                                    >
                                        {showPassword ? (
                                            <Eye size={20} />
                                        ) : (
                                            <EyeOff size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* CONFIRM PASSWORD */}
                            <div>
                                <label
                                    htmlFor="confirm_password"
                                    className={labelClass}
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
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        placeholder="Confirm new password"
                                        autoComplete="new-password"
                                        disabled={loading}
                                        className={inputClass}
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (prev) => !prev
                                            )
                                        }
                                        disabled={loading}
                                        aria-label={
                                            showConfirmPassword
                                                ? "Hide confirm password"
                                                : "Show confirm password"
                                        }
                                        className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-sm font-medium text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                                    >
                                        {showConfirmPassword ? (
                                            <Eye size={20} />
                                        ) : (
                                            <EyeOff size={20} />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* SUBMIT BUTTON */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
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

                    {/* BACK TO SIGN IN */}
                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() =>
                                navigate("/provider/sign-in")
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
