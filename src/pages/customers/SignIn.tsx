import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo-stiqrhub-health.jpeg"

interface Customer {
    id_customer: number;
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
    id_platform: number;
}

interface SignInResponse {
    message: string;
    customer: Customer;
    token: string;
}

interface SignInForm {
    email_customer: string;
    password_customer: string;
}

const SignIn = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<SignInForm>({
        email_customer: "",
        password_customer: "",
    });

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) {
            setError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!formData.email_customer.trim()) {
            setError("Email wajib diisi.");
            return;
        }

        if (!formData.password_customer) {
            setError("Password wajib diisi.");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await fetch(`${import.meta.env.VITE_API_URI}/customer/sign-in`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email_customer: formData.email_customer,
                    password_customer: formData.password_customer,
                }),
            });

            const result: SignInResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Email atau password yang Anda masukkan salah."
                );
            }

            sessionStorage.setItem("customer_token", result.token);

            localStorage.setItem("customer_data", JSON.stringify(result.customer));

            console.log("Sign In successful:", result);

            navigate("/customer/dashboard");
        } catch (err) {
            console.error("Sign in error:", err);

            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Terjadi kesalahan saat melakukan login.");
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

                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Sign In
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            Sign in to your StiqrHub Health account
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                            <p className="text-sm text-red-600">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
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
                                value={formData.email_customer}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                autoComplete="email"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label
                                    htmlFor="password_customer"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>

                                <button
                                    type="button"
                                    onClick={() => navigate("/customer/forgot-password")}
                                    className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700"
                                >
                                    Forgot password?
                                </button>
                            </div>

                            <div className="relative">
                                <input
                                    id="password_customer"
                                    name="password_customer"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password_customer}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    autoComplete="current-password"
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />

                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <Eye /> : <EyeOff />}
                                </button>
                            </div>
                        </div>

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

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Don't have an account?{" "}
                            <button
                                type="button"
                                onClick={() => navigate("/customer/sign-up")}
                                className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
                            >
                                Sign Up
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignIn;