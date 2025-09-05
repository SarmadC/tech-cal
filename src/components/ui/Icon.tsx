import React from 'react';
import { 
  MdVideoCall, 
  MdPerson, 
  MdLocationOn, 
  MdAccessTime,
  MdArrowForward,
  MdCalendarToday,
  MdEvent,
  MdSettings,
  MdSearch,
  MdFilterList,
  MdClose,
  MdMenu,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheck,
  MdCancel,
  MdInfo,
  MdWarning,
  MdError,
  MdDevices,
  MdBusiness,
  MdLogout,
  MdBarChart,
  MdExpandMore,
  MdCreditCard,
  MdTrendingUp,
  MdDashboard,
  MdAttachMoney,
  MdPeople,
  MdWifi,
  MdStar,
  MdCheckCircle,
  MdRefresh,
  MdLabel,
  MdEventAvailable,
  MdClear,
  MdChevronRight,
  MdArrowBack
} from 'react-icons/md';

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
  | 'credit-card'
  | 'trending-up'
  | 'dashboard'
  | 'filter'
  | 'close'
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
  | 'arrow_back';

interface IconProps {
  name: IconName;
  size?: number | string;
  className?: string;
  color?: string;
}

const iconMap = {
  'video-call': MdVideoCall,
  'person': MdPerson,
  'location': MdLocationOn,
  'time': MdAccessTime,
  'arrow-forward': MdArrowForward,
  'calendar': MdCalendarToday,
  'event': MdEvent,
  'settings': MdSettings,
  'search': MdSearch,
  'filter': MdFilterList,
  'close': MdClose,
  'menu': MdMenu,
  'add': MdAdd,
  'edit': MdEdit,
  'delete': MdDelete,
  'check': MdCheck,
  'cancel': MdCancel,
  'info': MdInfo,
  'warning': MdWarning,
  'error': MdError,
  'devices': MdDevices,
  'building': MdBusiness,
  'logout': MdLogout,
  'bar-chart': MdBarChart,
  'expand-more': MdExpandMore,
  'credit-card': MdCreditCard,
  'trending-up': MdTrendingUp,
  'dashboard': MdDashboard,
  'money': MdAttachMoney,
  'people': MdPeople,
  'wifi': MdWifi,
  'star': MdStar,
  'check-circle': MdCheckCircle,
  'refresh': MdRefresh,
  'label': MdLabel,
  'event_available': MdEventAvailable,
  'clear': MdClear,
  'chevron_right': MdChevronRight,
  'arrow_back': MdArrowBack,
};

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
      style={color ? { color } : undefined}
    />
  );
};

export default MaterialIcon;
