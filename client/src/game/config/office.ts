import type { ChatState } from '../../../../server/src/realtime/protocol';

export const OFFICE = {
  mapKey: 'office-map',
  mapUrl: '/assets/maps/office-test.json',
  tilesetKey: 'office-tiles',
  tilesetName: 'virtualoffice_base',
  tilesetUrl: '/assets/tilesets/virtualoffice_base_tileset_32x32.png',
  width: 832,
  height: 576,
  playerSpeed: 160,
  playerRadius: 10,
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
