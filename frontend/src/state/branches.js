/* The four outputs, locked. Order is the position on the HUD arc:
   top -> right -> bottom -> left (compass order, clockwise from north).
   See DOCTRINE.md "The four outputs" section. */

export const BRANCHES = [
  {
    id: 'audio',
    label: 'Audio Only',
    blurb: 'mp3 or wav',
    position: 'top',
  },
  {
    id: 'transcript',
    label: 'Transcript',
    blurb: '.txt',
    position: 'right',
  },
  {
    id: 'vocals',
    label: 'Vocals Only',
    blurb: 'vocal stem',
    position: 'bottom',
  },
  {
    id: 'twin',
    label: 'Audio Twin Pack',
    blurb: 'vocal + instrumental, zipped',
    position: 'left',
  },
]

export const POSITION_ANGLES = {
  top: -90,
  right: 0,
  bottom: 90,
  left: 180,
}
