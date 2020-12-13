/**
 * Wraps nedb in a promise so that it can be called with await
 */
class DbAsyncService {
  private db

  constructor(Datastore, dbPath) {
    this.db = new Datastore({ filename: dbPath, autoload: true })
  }

  async count(params) {
    return await new Promise((resolve, reject) => {
      this.db.count(params, (error, count) => {
        if (error) {
          reject(error)
        }

        resolve (count)
      })
    })
  }

  async update(query, update, options = {}) {
    return await new Promise((resolve, reject) => {
      this.db.update(query, update, options, (error, numReplaced) => {
        if (error) {
          reject(error)
        }

        resolve (numReplaced)
      })
    })
  }

  async insert(params) {
    return await new Promise((resolve, reject) => {
      this.db.insert(params, (error, newItem) => {
        if (error) {
          reject(error)
        }

        resolve (newItem)
      })
    })
  }

  async random(params, count) {
    const skipCount = Math.floor(Math.random() * count)

    return await new Promise((resolve, reject) => {
      // skip and limit are nedb methods that we use to find a pseudo-random image
      this.db.find(params).skip(skipCount).limit(1).exec((error, result) => {
        if (error) {
          reject(error)
        }

        resolve (result)
      })
    })
  }

  async findOne(params) {
    return await new Promise((resolve, reject) => {
      this.db.findOne(params, (error, entry) => {
        if (error) {
          reject(error)
        }

        resolve (entry)
      })
    })
  }

  async find(params) {
    return await new Promise((resolve, reject) => {
      this.db.find(params, (error, entries) => {
        if (error) {
          reject(error)
        }

        resolve (entries)
      })
    })
  }

  async findAndSort(findParams, sortParams) {
    return await new Promise((resolve, reject) => {
      this.db.find(findParams).sort(sortParams).exec((error, entries) => {
        if (error) {
          reject(error)
        }

        resolve (entries)
      })
    })
  }

  async remove(query, options = {}) {
    return await new Promise((resolve, reject) => {
      this.db.remove(query, options, (error, numRemoved) => {
        if (error) {
          reject(error)
        }

        resolve (numRemoved)
      })
    })
  }
}

export { DbAsyncService }