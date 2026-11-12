const fs = require("node:fs/promises")
const path = require("node:path")
const { withDangerousMod } = require("expo/config-plugins")

const NETWORK_TIMEOUT_MS = 120_000

module.exports = function withGradleWrapperTimeout(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const wrapperPropertiesPath = path.join(
        config.modRequest.platformProjectRoot,
        "gradle",
        "wrapper",
        "gradle-wrapper.properties"
      )
      const contents = await fs.readFile(wrapperPropertiesPath, "utf8")
      const updatedContents = /^networkTimeout=.*$/m.test(contents)
        ? contents.replace(
            /^networkTimeout=.*$/m,
            `networkTimeout=${NETWORK_TIMEOUT_MS}`
          )
        : `${contents.trimEnd()}\nnetworkTimeout=${NETWORK_TIMEOUT_MS}\n`

      if (updatedContents !== contents) {
        await fs.writeFile(wrapperPropertiesPath, updatedContents)
      }

      return config
    },
  ])
}
