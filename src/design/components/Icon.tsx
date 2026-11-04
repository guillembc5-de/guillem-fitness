import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

import { colors, type ColorToken } from '../tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: ColorToken;
};

export function Icon({ name, size = 24, color = 'text' }: Props) {
  return <Ionicons name={name} size={size} color={colors[color]} accessibilityElementsHidden importantForAccessibility="no" />;
}
