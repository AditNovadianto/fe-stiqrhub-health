import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../../images/logo-stiqrhub-health.jpeg"

interface SignUpForm {
    name_customer: string;
    email_customer: string;
    password_customer: string;
    confirm_password: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
}

interface Customer {
    id_customer: number;
    name_customer: string;
    email_customer: string;
    phone_number_customer: string;
    dob_customer: string;
    gender_customer: string;
    id_platform: number;
}

interface SignUpResponse {
    message: string;
    customer: Customer;
    token: string;
}

const SignUp = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState<SignUpForm>({
        name_customer: "",
        email_customer: "",
        password_customer: "",
        confirm_password: "",
        phone_number_customer: "",
        dob_customer: "",
        gender_customer: "",
    });

    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showConfirmPassword, setShowConfirmPassword] =
        useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
        if (!formData.name_customer.trim()) {
            return "Nama wajib diisi.";
        }

        if (!formData.email_customer.trim()) {
            return "Email wajib diisi.";
        }

        if (!formData.phone_number_customer.trim()) {
            return "Nomor telepon wajib diisi.";
        }

        if (!formData.dob_customer) {
            return "Tanggal lahir wajib diisi.";
        }

        if (!formData.gender_customer) {
            return "Gender wajib dipilih.";
        }

        if (!formData.password_customer) {
            return "Password wajib diisi.";
        }

        if (formData.password_customer.length < 8) {
            return "Password minimal 8 karakter.";
        }

        if (
            formData.password_customer !==
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

            const response = await fetch(
                `${import.meta.env.VITE_API_URI}/customer/sign-up`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name_customer: formData.name_customer.trim(),
                        email_customer: formData.email_customer.trim(),
                        password_customer: formData.password_customer,
                        phone_number_customer:
                            formData.phone_number_customer.trim(),
                        dob_customer: formData.dob_customer,
                        gender_customer: formData.gender_customer,
                        id_platform: 1,
                    }),
                }
            );

            const result: SignUpResponse = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Gagal melakukan pendaftaran."
                );
            }

            localStorage.setItem(
                "customer_token",
                result.token
            );

            localStorage.setItem(
                "customer_data",
                JSON.stringify(result.customer)
            );

            console.log("Sign up successful:", result);

            navigate("/customer/sign-in");
        } catch (err) {
            console.error("Sign up error:", err);

            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(
                    "Terjadi kesalahan saat melakukan pendaftaran."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
            <div className="w-full max-w-lg">
                <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
                    <img className="h-20 w-20 m-auto" src={logo} alt="Logo" />

                    {/* Header */}
                    <div className="mb-8 text-center">
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Create Account
                        </h1>

                        <p className="mt-2 text-sm text-gray-500">
                            Create your StiqrHub Health account
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

                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* Name */}
                        <div>
                            <label
                                htmlFor="name_customer"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Full Name
                            </label>

                            <input
                                id="name_customer"
                                name="name_customer"
                                type="text"
                                value={formData.name_customer}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                autoComplete="name"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                        </div>

                        {/* Email */}
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

                        {/* Phone Number */}
                        <div>
                            <label
                                htmlFor="phone_number_customer"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Phone Number
                            </label>

                            <input
                                id="phone_number_customer"
                                name="phone_number_customer"
                                type="tel"
                                value={formData.phone_number_customer}
                                onChange={handleChange}
                                placeholder="08xxxxxxxxxx"
                                autoComplete="tel"
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                            />
                        </div>

                        {/* Date of Birth + Gender */}
                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div>
                                <label
                                    htmlFor="dob_customer"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Date of Birth
                                </label>

                                <input
                                    id="dob_customer"
                                    name="dob_customer"
                                    type="date"
                                    value={formData.dob_customer}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="gender_customer"
                                    className="mb-2 block text-sm font-medium text-gray-700"
                                >
                                    Gender
                                </label>

                                <select
                                    id="gender_customer"
                                    name="gender_customer"
                                    value={formData.gender_customer}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                >
                                    <option value="">
                                        Select gender
                                    </option>

                                    <option value="male">
                                        Male
                                    </option>

                                    <option value="female">
                                        Female
                                    </option>
                                </select>
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password_customer"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    id="password_customer"
                                    name="password_customer"
                                    type={
                                        showPassword ? "text" : "password"
                                    }
                                    value={formData.password_customer}
                                    onChange={handleChange}
                                    placeholder="Enter your password"
                                    autoComplete="new-password"
                                    disabled={loading}
                                    className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-16 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500 hover:text-gray-700"
                                >
                                    {showPassword ? <Eye /> : <EyeOff />}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label
                                htmlFor="confirm_password"
                                className="mb-2 block text-sm font-medium text-gray-700"
                            >
                                Confirm Password
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
                                    placeholder="Confirm your password"
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

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="cursor-pointer flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
                        >
                            {loading ? (
                                <>
                                    <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Creating account...
                                </>
                            ) : (
                                "Create Account"
                            )}
                        </button>
                    </form>

                    {/* Sign In */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            Already have an account?{" "}
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/customer/sign-in")
                                }
                                className="cursor-pointer font-medium text-blue-600 hover:text-blue-700"
                            >
                                Sign In
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;