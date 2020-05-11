export class ImageDetails {
  imageName: string
  directory: string
  relativeDirectory: string
  shown: boolean
  hidden: boolean
  rotate: number
  _id?: string
}

export class DirectoryDetails extends ImageDetails {
  type: string
}