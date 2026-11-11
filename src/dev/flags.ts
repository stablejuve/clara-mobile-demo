// Banderas de desarrollo (solo __DEV__): las fija el deep link `relayermobiledemo://demo/open/<screen>?scrollEnd=1`
// y las consume la página al montarse. Nunca se leen en producción.
export const devFlags = { scrollEndOnMount: false };
