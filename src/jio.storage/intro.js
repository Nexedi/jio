/**
 * Adds 6 storages to JIO.
 * - LocalStorage ('local')
 * - DAVStorage ('dav')
 * - ReplicateStorage ('replicate')
 * - IndexedStorage ('indexed')
 * - CryptedStorage ('crypted')
 * - ConflictManagerStorage ('conflictmanager')
 *
 * @module JIOStorages
 */
(function (jIO, $, Base64, sjcl, hex_sha256) {
