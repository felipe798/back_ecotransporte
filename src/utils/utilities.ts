export async function abbreviateField(fieldValue: string, spaceLettersLimit: number = 3): Promise<string> {
    const words = fieldValue.split(' ');
  
    if (words.length > 1) {
      // Si hay espacios, tomar las primeras letras hasta completar spaceLettersLimit
      const abbreviation = words.slice(0, spaceLettersLimit).map(word => word[0].toUpperCase()).join('');
      return abbreviation;
    } else {
      // Si es una sola palabra, tomar la primera, una al azar y la última
      const firstLetter = words[0][0].toUpperCase();
      const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Letra al azar
      const lastLetter = words[0][words[0].length - 1].toUpperCase();
  
      return firstLetter + randomLetter + lastLetter;
    }
  }


  export function generateRandomPass(length: number = 12): string {
    const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_+=';
    let password = '';
  
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters.charAt(randomIndex);
    }
  
    return password;
  }
  
