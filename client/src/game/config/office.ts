import type { ChatState } from '../../../../server/src/realtime/protocol';

export const OFFICE = {
  mapKey: 'office-map',
  mapUrl: '/assets/maps/office-test.json',
  tilesetKey: 'office-tiles',
  tilesetName: 'virtualoffice_custom_tiles',
  tilesetUrl: '/assets/custom/tiles/office_tileset_32x32.png',
  furnitureKey: 'office-furniture',
  furnitureUrl: '/assets/custom/furniture/office_furniture_64x64.png',
  decorKey: 'office-decor',
  decorUrl: '/assets/custom/decor/office_decor_32x32.png',
  avatarKey: 'office-avatar',
  avatarUrl: '/assets/custom/avatars/avatar_basic_32x48.png',
  width: 832,
  height: 576,
  playerSpeed: 160,
  playerRadius: 10,
  nameOffset: 46,
} as const;

export type OfficeCallbacks = {
  onReady: () => void;
  onAreaChange: (area: string) => void;
  onError: (message: string) => void;
  onNetwork: (status: 'connecting' | 'online' | 'reconnecting') => void;
  onPresence: (total: number) => void;
  onSessionExpired: () => void;
  onChat: (state: ChatState) => void;
};

export type PlayerSnapshot = {
  x: number; y: number; velocityX: number; velocityY: number;
  name: string; labelX: number; labelY: number;
};
