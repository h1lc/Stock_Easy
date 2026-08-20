const fs = require('fs');
const path = require('path');

/**
 * Test de non-regression pour l'anomalie BUG-2026-07-001.
 *
 * Cette anomalie venait de migrations Prisma non versionnees (dossier exclu par
 * .gitignore) : au deploiement, `prisma migrate deploy` ne trouvait rien a
 * appliquer, la colonne User.googleId n'existait pas et l'authentification
 * echouait en erreur 500.
 *
 * Ce test verifie la matiere premiere du deploiement — les fichiers de
 * migration presents dans le depot — sans avoir besoin d'une base de donnees.
 * Il tient donc dans la CI actuelle, qui n'instancie pas de PostgreSQL.
 */
const MIGRATIONS_DIR = path.join(__dirname, '..', 'src', 'prisma', 'migrations');

function readAllMigrationSql() {
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter((entry) => fs.statSync(path.join(MIGRATIONS_DIR, entry)).isDirectory())
    .map((dir) => fs.readFileSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql'), 'utf8'))
    .join('\n');
}

describe('Migrations Prisma versionnees (non-regression BUG-2026-07-001)', () => {
  it('le dossier de migrations existe et n\'est pas vide', () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    const dirs = fs.readdirSync(MIGRATIONS_DIR)
      .filter((e) => fs.statSync(path.join(MIGRATIONS_DIR, e)).isDirectory());
    expect(dirs.length).toBeGreaterThan(0);
  });

  it('le verrou de migration (migration_lock.toml) est versionne et cible PostgreSQL', () => {
    const lock = path.join(MIGRATIONS_DIR, 'migration_lock.toml');
    expect(fs.existsSync(lock)).toBe(true);
    expect(fs.readFileSync(lock, 'utf8')).toMatch(/provider\s*=\s*"postgresql"/);
  });

  it('chaque dossier de migration contient bien un fichier migration.sql', () => {
    const dirs = fs.readdirSync(MIGRATIONS_DIR)
      .filter((e) => fs.statSync(path.join(MIGRATIONS_DIR, e)).isDirectory());
    for (const dir of dirs) {
      expect(fs.existsSync(path.join(MIGRATIONS_DIR, dir, 'migration.sql'))).toBe(true);
    }
  });

  it('les colonnes d\'authentification introuvables lors de l\'anomalie sont bien creees', () => {
    const sql = readAllMigrationSql();
    for (const column of ['googleId', 'refreshToken', 'resetToken', 'resetTokenExpires']) {
      expect(sql).toMatch(new RegExp(`ADD COLUMN[^;]*"${column}"`, 'i'));
    }
  });

  it('la contrainte d\'unicite sur googleId est presente', () => {
    expect(readAllMigrationSql()).toMatch(/CREATE UNIQUE INDEX[^;]*"User_googleId_key"/i);
  });

  it('le mot de passe devient optionnel pour les comptes Google', () => {
    expect(readAllMigrationSql()).toMatch(/ALTER COLUMN "password" DROP NOT NULL/i);
  });
});
