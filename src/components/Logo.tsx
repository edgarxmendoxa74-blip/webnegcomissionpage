import React from 'react';

interface LogoMarkProps {
    className?: string;
}

/** The official WebNegosyo mark (public/logo-mark.png, a transparent PNG cut from the brand logo). */
export const LogoMark: React.FC<LogoMarkProps> = ({ className }) => (
    <img
        src={`${import.meta.env.BASE_URL}logo-mark.png`}
        alt="WebNegosyo"
        draggable={false}
        className={`select-none ${className ?? ''}`}
    />
);

interface LogoProps {
    className?: string;
    markClassName?: string;
    wordmarkClassName?: string;
    showWordmark?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
    className = '',
    markClassName = 'h-16',
    wordmarkClassName = 'text-2xl',
    showWordmark = true,
}) => (
    <div className={`flex flex-col items-center ${className}`}>
        <LogoMark className={`${markClassName} w-auto`} />
        {showWordmark && (
            <span className={`mt-4 font-extrabold not-italic tracking-tight text-ink ${wordmarkClassName}`}>
                WebNegosyo
            </span>
        )}
    </div>
);
