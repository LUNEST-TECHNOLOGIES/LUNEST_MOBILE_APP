/**
 * Host Profile Tab
 * Uses the same ProfileScreen but in host mode context
 */

import ProfileScreen from '../../src/screens/profile/ProfileScreen';

export default function HostProfile() {
  return <ProfileScreen isHostMode={true} />;
}
