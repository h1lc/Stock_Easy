const xss = require('xss');

/**
 * Neutralise le HTML/JS d'une chaine issue de l'utilisateur (OWASP A03).
 *
 * Defense en profondeur : React echappe deja a l'affichage, mais on ne veut
 * pas stocker de charge active en base — elle pourrait ressortir par un
 * export, un email ou un futur client non-React.
 *
 * Les valeurs vides, nulles ou non-chaines sont renvoyees telles quelles.
 */
const sanitize = (value) => (typeof value === 'string' && value ? xss(value.trim()) : value);

module.exports = { sanitize };
