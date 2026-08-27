import { useWindowDimensions, Platform } from 'react-native';

/**
 * useResponsive Hook
 * 
 * Provides unified, reactive screen dimensions and layout breakpoints
 * for phone, iPad, and tablet responsiveness across iOS, Android, and Web.
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  // iPad / Tablet detection
  const isIPad = Platform.OS === 'ios' && Platform.isPad;
  const isTablet = isIPad || width >= 768;
  const isLandscape = width > height;
  const isSmallPhone = width < 375;
  const isLargeTablet = width >= 1024;

  // Grid column count for property cards / lists
  const gridColumns = isLargeTablet ? 3 : isTablet ? 2 : 1;

  // Content width constraints to prevent excessive stretching on tablets
  const maxContentWidth = isLargeTablet ? 1100 : isTablet ? 840 : '100%';
  const maxFormWidth = isTablet ? 500 : '100%';
  const maxCardWidth = isTablet ? 720 : '100%';
  const maxModalWidth = isTablet ? 560 : '100%';
  const maxNavWidth = isTablet ? 600 : '100%';

  // Adaptive spacing & padding
  const horizontalPadding = isTablet ? Math.max(32, (width - (typeof maxContentWidth === 'number' ? maxContentWidth : width)) / 2 + 24) : 20;
  const contentPadding = isTablet ? 32 : isSmallPhone ? 16 : 20;

  // Helper container style for centering forms/views on iPad
  const formContainerStyle = isTablet ? {
    maxWidth: maxFormWidth,
    width: '100%',
    alignSelf: 'center',
  } : {
    width: '100%',
  };

  const contentContainerStyle = isTablet ? {
    maxWidth: maxContentWidth,
    width: '100%',
    alignSelf: 'center',
  } : {
    width: '100%',
  };

  return {
    width,
    height,
    isIPad,
    isTablet,
    isLandscape,
    isSmallPhone,
    isLargeTablet,
    gridColumns,
    maxContentWidth,
    maxFormWidth,
    maxCardWidth,
    maxModalWidth,
    maxNavWidth,
    horizontalPadding,
    contentPadding,
    formContainerStyle,
    contentContainerStyle,
  };
};

export default useResponsive;
