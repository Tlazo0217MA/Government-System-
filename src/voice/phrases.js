// Sesotho phrases mapped to the English commands the voice engine understands.
// DRAFT: these have not been checked by a fluent Sesotho speaker.
export const SESOTHO_PHRASES = [
  ['kenya moahi', 'add citizen'],
  ['taolo ea baahi', 'citizen management'],
  ['pokello ea liketso', 'activity log'],
  ['phrofaele ea ka', 'my profile'],
  ['likopo tsa ka', 'my applications'],
  ['litšebeletso', 'services'],
  ['litsebeletso', 'services'],
  ['litsebiso', 'notifications'],
  ['letlapa', 'dashboard'],
  ['likopo', 'applications'],
  ['thuso', 'help'],
  ['morao', 'go back'],
  ['tsoa', 'log out'],
  ['batla', 'search for'],
  ['netefatsa', 'confirm'],
  ['khansela', 'cancel'],
];

export function translateSesotho(text) {
  let result = text.toLowerCase();
  SESOTHO_PHRASES.forEach(([sesotho, english]) => {
    if (result.includes(sesotho)) result = result.replace(sesotho, english);
  });
  return result;
}

export const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
};
