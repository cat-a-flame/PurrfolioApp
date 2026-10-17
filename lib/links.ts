import { Linking } from 'react-native';

export const LINKS = {
  community: 'https://discord.gg/PWwK8bvvQa',
  terms: 'https://purrfolio.app/terms',
  privacy: 'https://purrfolio.app/privacy',
  webApp: 'https://my.purrfolio.app',
};

export function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}
