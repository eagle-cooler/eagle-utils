/* global eagle */
import JsonFile from '../utils/_JsonFile.js';
import path from 'path';
import { roamingPath } from '../utils/app.js';

// Scope enumeration
export const Scope = {
  APP: 'app',
  PLUGIN: 'plugin',
  ITEM: 'item',
  LIBRARY: 'library',
  GLOBAL: 'global',
};

// Flag enumeration
export const Flag = {
  PLUGIN_ONLY: 'pluginOnly',
};

class Config {
  constructor(scope, flags = [], item = null) {
    this.#validateScopeFlags(scope, flags);
    this.scope = scope;
    this.flags = new Set(flags);
    this.item = item;
    this._cache = this.#createCache();
  }

  #validateScopeFlags(scope, flags) {
    const invalidCombos = {
      [Scope.PLUGIN]: [Flag.PLUGIN_ONLY],
    };

    const invalidFlags = invalidCombos[scope] || [];
    const foundInvalid = flags.some((flag) => invalidFlags.includes(flag));

    if (foundInvalid) {
      throw new Error(
        `Invalid flag combination for ${scope} scope: [${flags.join(', ')}]`
      );
    }

    // Special case: PLUGIN_ONLY requires plugin context
    if (flags.includes(Flag.PLUGIN_ONLY) && !eagle?.plugin?.manifest?.id) {
      throw new Error('PLUGIN_ONLY flag requires active plugin context');
    }
  }

  #createCache() {
    const configsPath = path.join(roamingPath, 'configurations');

    switch (this.scope) {
      case Scope.APP:
        return JsonFile.getInstance(path.join(configsPath, 'appConfig.json'));

      case Scope.PLUGIN:
        return JsonFile.getInstance(
          path.join(configsPath, 'pluginConfig.json')
        );

      case Scope.ITEM:
        if (!this.item?.filePath)
          throw new Error('Item scope requires an item object');
        return JsonFile.getInstance(
          path.join(path.dirname(this.item.filePath), 'item.config.json')
        );
      case Scope.LIBRARY: {
        const libraryPath = eagle.library.path;
        return JsonFile.getInstance(
          path.join(libraryPath, 'library.config.json')
        );
      }

      default: // GLOBAL
        return JsonFile.getInstance(
          path.join(configsPath, 'globalConfig.json')
        );
    }
  }

  #buildKey(key) {
    let parts = [];

    if (this.flags.has(Flag.PLUGIN_ONLY)) {
      parts.push(eagle.plugin.manifest.id);
    }

    parts.push(key);
    return parts.join('::');
  }

  get(key) {
    return this._cache.get(this.#buildKey(key));
  }

  set(key, value) {
    this._cache.set(this.#buildKey(key), value);
  }

  delete(key) {
    this._cache.delete(this.#buildKey(key));
  }
}

// Usage examples:
/**
 * Creates a new Config instance for the given scope and flags.
 *
 * @param {string} scope - The scope of the configuration.
 * @param {string[]} flags - The flags to apply to the configuration.
 * @param {object} item - The item object to associate with the configuration.
 * @return {Config} A new Config instance.
 */
export function config(scope, flags = [], item = null) {
  return new Config(scope, flags, item);
}
