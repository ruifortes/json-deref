import whatwgUrl from 'whatwg-url'
const parseURL = whatwgUrl.parseURL
const URL = whatwgUrl.URL
const serializeURL = whatwgUrl.serializeURL

// function replaceVars(text, vars) {
//   // const re = new RegExp(`{(${Object.getOwnPropertyNames(vars).join('|')})}`)
//   Object.getOwnPropertyNames(vars).forEach(key => {
//     text = text.replace(`{${key}}`, vars[key])
//   })
//   return text
// }

export default function parseRef($ref, currentId, refChain = [], vars = {}) {
  // const _url = new URL(replaceVars($ref, vars), currentId !== '' ? currentId : undefined)

  const _url = new URL($ref, currentId !== '' ? currentId : undefined)
  if(_url.origin === 'null') return {url: null}

  const url = _url.origin + _url.pathname + _url.search
  const pointer = _url.hash
  const isLocalRef = currentId === url

  var isCircular

  if(refChain.length) {
    const ref_urlRecord = parseURL(_url.href)

    isCircular = refChain.some(backRef => {
      const backRef_urlRecord = parseURL(backRef)

      const externallyCircular = ref_urlRecord.path.every((token, i) => {
        return token === backRef_urlRecord.path[i]
      })

      const ref_frag = ref_urlRecord.fragment || ''
      const backRef_frag = backRef_urlRecord.fragment || ''

      const internallyCircular = backRef_frag.startsWith(ref_frag)

      return externallyCircular && internallyCircular
    })

  }

  return {url, pointer, isLocalRef, isCircular, fullUrl: url + pointer}
}
