import Svg, { Path } from 'react-native-svg';

/**
 * Check Icon Component
 * Small checkmark icon for form elements and validation states
 *
 * @param {number} size - Icon size in pixels (default: 16)
 * @param {string} color - Icon color (default: '#FFFFFF')
 * @returns {JSX.Element} SVG checkmark icon
 */
const CheckIcon = ({ size = 16, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9.55 18L3.85 12.3L5.275 10.875L9.55 15.15L18.725 5.975L20.15 7.4L9.55 18Z"
      fill={color}
    />
  </Svg>
);

export default CheckIcon;
