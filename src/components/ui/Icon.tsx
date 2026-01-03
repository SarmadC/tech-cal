import React from 'react';
import {
    VideoCameraIcon,
    UserIcon,
    MapPinIcon,
    ClockIcon,
    ArrowRightIcon,
    CalendarIcon,
    CalendarPlusIcon,
    GearIcon,
    MagnifyingGlassIcon,
    FunnelSimpleIcon,
    XIcon,
    ListIcon,
    PlusIcon,
    PencilSimpleIcon,
    TrashIcon,
    CheckIcon,
    XCircleIcon,
    InfoIcon,
    WarningCircleIcon,
    WarningOctagonIcon,
    DeviceMobileIcon,
    BuildingsIcon,
    SignOutIcon,
    ChartBarIcon,
    CaretDownIcon,
    CaretUpIcon,
    CreditCardIcon,
    TrendUpIcon,
    GaugeIcon,
    CurrencyDollarIcon,
    UsersIcon,
    WifiHighIcon,
    StarIcon,
    CheckCircleIcon,
    ArrowClockwiseIcon,
    TagIcon,
    CalendarCheckIcon,
    XSquareIcon,
    CaretRightIcon,
    CaretLeftIcon,
    ArrowLeftIcon,
    CaretDoubleLeftIcon,
    HouseIcon,
    CodeIcon,
    ArrowUpRightIcon,
    CompassIcon,
    ImageIcon,
    CopyIcon,
} from '@phosphor-icons/react';

export type IconName =
    | 'video-call'
    | 'person'
    | 'location'
    | 'time'
    | 'arrow-forward'
    | 'calendar'
    | 'event'
    | 'settings'
    | 'search'
    | 'filter'
    | 'close'
    | 'menu'
    | 'add'
    | 'edit'
    | 'delete'
    | 'check'
    | 'cancel'
    | 'info'
    | 'warning'
    | 'error'
    | 'devices'
    | 'building'
    | 'logout'
    | 'bar-chart'
    | 'expand-more'
    | 'expand-less'
    | 'credit-card'
    | 'trending-up'
    | 'dashboard'
    | 'money'
    | 'people'
    | 'wifi'
    | 'star'
    | 'check-circle'
    | 'refresh'
    | 'label'
    | 'event_available'
    | 'clear'
    | 'chevron_right'
    | 'chevron_left'
    | 'arrow_back'
    | 'chevron_double_left'
    | 'home'
    | 'code'
    | 'arrow-up-right'
    | 'compass'
    | 'image'
    | 'copy';

interface IconProps {
    name: IconName;
    size?: number | string;
    className?: string;
    color?: string;
}

const iconMap = {
    'video-call': VideoCameraIcon,
    'person': UserIcon,
    'location': MapPinIcon,
    'time': ClockIcon,
    'arrow-forward': ArrowRightIcon,
    'calendar': CalendarIcon,
    'event': CalendarPlusIcon,
    'settings': GearIcon,
    'search': MagnifyingGlassIcon,
    'filter': FunnelSimpleIcon,
    'close': XIcon,
    'menu': ListIcon,
    'add': PlusIcon,
    'edit': PencilSimpleIcon,
    'delete': TrashIcon,
    'check': CheckIcon,
    'cancel': XCircleIcon,
    'info': InfoIcon,
    'warning': WarningCircleIcon,
    'error': WarningOctagonIcon,
    'devices': DeviceMobileIcon,
    'building': BuildingsIcon,
    'logout': SignOutIcon,
    'bar-chart': ChartBarIcon,
    'expand-more': CaretDownIcon,
    'expand-less': CaretUpIcon,
    'credit-card': CreditCardIcon,
    'trending-up': TrendUpIcon,
    'dashboard': GaugeIcon,
    'money': CurrencyDollarIcon,
    'people': UsersIcon,
    'wifi': WifiHighIcon,
    'star': StarIcon,
    'check-circle': CheckCircleIcon,
    'refresh': ArrowClockwiseIcon,
    'label': TagIcon,
    'event_available': CalendarCheckIcon,
    'clear': XSquareIcon,
    'chevron_right': CaretRightIcon,
    'chevron_left': CaretLeftIcon,
    'arrow_back': ArrowLeftIcon,
    'chevron_double_left': CaretDoubleLeftIcon,
    'home': HouseIcon,
    'code': CodeIcon,
    'arrow-up-right': ArrowUpRightIcon,
    'compass': CompassIcon,
    'image': ImageIcon,
    'copy': CopyIcon,
} as const;

export const MaterialIcon: React.FC<IconProps> = ({
    name,
    size = 16,
    className = '',
    color
}) => {
    const IconComponent = iconMap[name];

    if (!IconComponent) {
        console.warn(`Icon "${name}" not found`);
        return null;
    }

    return (
        <IconComponent
            size={size}
            className={className}
            color={color}
        />
    );
};

export default MaterialIcon;
