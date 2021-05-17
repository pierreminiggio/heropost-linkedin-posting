// Copy this file to test.js
// You can then test using npm test

import { postLink } from './index.js'

(async () => {
    console.log(await postLink(
        'Heropost login or email',
        'Heropost password',
        'Linkedin channel id',
        {
            url: 'https://google.com',
            title: 'vidéo automatique test',
            caption: 'caption automatique test',
        },
        {show: true}
    ))
})()
