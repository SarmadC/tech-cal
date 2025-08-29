'use client';

import React, { useState } from 'react';
import { MdOutlineArrowOutward } from "react-icons/md";
import ShinyText from './ShinyText';
import './ShinyText.css';

interface LearnMoreButtonProps {
    onClick?: () => void;
    className?: string;
    showForLargeEvents?: boolean;
}

export const LearnMoreButton: React.FC<LearnMoreButtonProps> = ({ 
    onClick, 
    className = '',
    showForLargeEvents = false
}) => {
    const [isHovered, setIsHovered] = useState(false);

    // Only show for large events
    if (!showForLargeEvents) {
        return null;
    }

    return (
        <button
            className={`learn-more-button ${className}`}
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Learn More"
            type="button"
        >
                                                    <div className="button-content">
                        <MdOutlineArrowOutward className={`arrow-icon ${isHovered ? 'arrow-hovered' : ''}`} />
                        <ShinyText 
                            text="Learn More" 
                            disabled={!isHovered} 
                            speed={3} 
                            className={`learn-more-shiny ${isHovered ? 'text-visible' : ''}`}
                        />
                    </div>
                </button>
    );
};
