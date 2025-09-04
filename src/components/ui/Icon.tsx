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
  MdBusiness
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
  | 'building';

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
};

export const Icon: React.FC<IconProps> = ({ 
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

export default Icon;
