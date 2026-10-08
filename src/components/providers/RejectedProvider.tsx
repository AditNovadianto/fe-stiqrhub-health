import {
    CircleX,
    RotateCcw,
} from "lucide-react";

import type {
    RegistrationData,
} from "../../pages/providers/SignUp";

interface Props {
    registration: RegistrationData;
    onRestart: () => void;
}

const RejectedProvider = ({
    registration,
    onRestart,
}: Props) => {
    return (
        <div className="mx-auto max-w-lg rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
                <CircleX
                    size={32}
                />
            </div>

            <h1 className="mt-5 text-2xl font-semibold text-gray-900">
                Registration
                Rejected
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
                Unfortunately,
                your provider
                registration could
                not be approved.
            </p>

            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-left">
                <div>
                    <p className="text-xs text-gray-400">
                        Provider ID
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                        #
                        {
                            registration.id_provider
                        }
                    </p>
                </div>

                <div className="mt-4">
                    <p className="text-xs text-gray-400">
                        Registered
                        Email
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                        {
                            registration.email_provider
                        }
                    </p>
                </div>

                <div className="mt-4">
                    <p className="text-xs text-gray-400">
                        Status
                    </p>

                    <p className="mt-1 text-sm font-semibold text-red-600">
                        REJECTED
                    </p>
                </div>
            </div>

            <button
                type="button"
                onClick={onRestart}
                className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
                <RotateCcw
                    size={17}
                />
                Register Again
            </button>
        </div>
    );
};

export default RejectedProvider;