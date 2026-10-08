import {
    Check,
    FileText,
    MailCheck,
    ShieldCheck,
    UserRound,
    X,
} from "lucide-react";

export type ProviderProgressStep =
    | "INFORMATION"
    | "DOCUMENTS"
    | "PENDING_OTP"
    | "PENDING_APPROVAL"
    | "APPROVED"
    | "REJECTED";

interface Props {
    currentStep: ProviderProgressStep;
}

const steps = [
    {
        key: "INFORMATION",
        label: "Provider Info",
        description: "Basic information",
        icon: UserRound,
    },
    {
        key: "DOCUMENTS",
        label: "Documents",
        description: "Required documents",
        icon: FileText,
    },
    {
        key: "PENDING_OTP",
        label: "Verification",
        description: "Verify your email",
        icon: MailCheck,
    },
    {
        key: "PENDING_APPROVAL",
        label: "Review",
        description: "Internal review",
        icon: ShieldCheck,
    },
    {
        key: "APPROVED",
        label: "Provider User",
        description: "Create your account",
        icon: UserRound,
    },
] as const;

const getStepIndex = (
    step: ProviderProgressStep
) => {
    if (step === "REJECTED") {
        return 3;
    }

    return steps.findIndex(
        (item) => item.key === step
    );
};

const ProviderProgress = ({
    currentStep,
}: Props) => {
    const currentIndex =
        getStepIndex(currentStep);

    const isRejected =
        currentStep === "REJECTED";

    return (
        <div className="mb-8 rounded-2xl border border-gray-100 bg-white px-5 py-6 shadow-sm sm:px-7">
            <div className="relative">
                <div className="absolute left-5 right-5 top-5 hidden h-0.5 bg-gray-200 sm:block" />

                <div
                    className={`absolute left-5 top-5 hidden h-0.5 transition-all duration-500 sm:block ${isRejected
                            ? "bg-red-500"
                            : "bg-blue-600"
                        }`}
                    style={{
                        width: `${(Math.max(
                            currentIndex,
                            0
                        ) /
                                (steps.length -
                                    1)) *
                            100
                            }%`,
                        maxWidth:
                            "calc(100% - 2.5rem)",
                    }}
                />

                <div className="relative grid grid-cols-5 gap-2">
                    {steps.map(
                        (step, index) => {
                            const Icon =
                                step.icon;

                            const completed =
                                index <
                                currentIndex;

                            const active =
                                index ===
                                currentIndex;

                            const rejected =
                                isRejected &&
                                index === 3;

                            return (
                                <div
                                    key={
                                        step.key
                                    }
                                    className="flex flex-col items-center text-center"
                                >
                                    <div
                                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${rejected
                                                ? "border-red-500 bg-red-500 text-white"
                                                : completed
                                                    ? "border-blue-600 bg-blue-600 text-white"
                                                    : active
                                                        ? "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-50"
                                                        : "border-gray-200 bg-white text-gray-400"
                                            }`}
                                    >
                                        {rejected ? (
                                            <X
                                                size={
                                                    18
                                                }
                                            />
                                        ) : completed ? (
                                            <Check
                                                size={
                                                    18
                                                }
                                            />
                                        ) : (
                                            <Icon
                                                size={
                                                    18
                                                }
                                            />
                                        )}
                                    </div>

                                    <p
                                        className={`mt-3 text-xs font-semibold sm:text-sm ${rejected
                                                ? "text-red-600"
                                                : active ||
                                                    completed
                                                    ? "text-gray-900"
                                                    : "text-gray-400"
                                            }`}
                                    >
                                        {
                                            step.label
                                        }
                                    </p>

                                    <p className="mt-1 hidden text-xs text-gray-400 lg:block">
                                        {
                                            step.description
                                        }
                                    </p>
                                </div>
                            );
                        }
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProviderProgress;