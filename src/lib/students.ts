export type Level = "SMP" | "SMK";
export interface Student { id: string; name: string; className: string; level: Level }

const roster: Record<string, string[]> = {
  "7A": [
    "Aini Rayhana Anwar", "Aqilah Khanza Shafiyyah", "Dzakiyya Talita Sakhi", "Farannisa Hana Mulia", "Hamidira Atfas", "Kanaya Zahraa Tasmirah", "Keona Premazzata Ishaq", "Lubna Nur Aini", "Nadine Ramadhani Sahnan Hasyim", "Quinsha Kirani Azzahra", "Shabiyya Jingga Kirana", "Siti Hilya Kamilah Izzaty", "Zidni Acitya Kalyani Arjwa",
  ],
  "7B": [
    "Alisha Safiya Rizki", "Alyssia Faradisa", "Deevanux Melody Bunga Jafati", "Eira Haleemah", "Ghaniyya Safiya Ahmad", "Hanania Akma Sekar Tanjung", "Keizhi Bellthaqifah Dhavahanti", "Khalila Shadrach Ferrea", "Nadha Astrulabi Ardinal", "Qaireen Alisha Mujianto", "Raihana Tazkia Ramadita", "Safa Syakirah Az Zahra", "Shakila Nada Zalfa", "Zhafira Desniayu Fariah",
  ],
  "8A": [
    "Aima Ellovin Jiran Meliana", "Aluna Azka Inamullah", "Chila Nasyitha", "Fazila Izzati Kusumawardhani", "Ilma Fadhilah Mumtazah", "Kayyisah Almeera Aufar", "Mahira Anindya Maheswari", "Naura Azmi Rinjani", "Rayana Adelia Utami", "Siti Hilwa Malikah Tadzally", "Tisya Nisrina", "Zhafirah Ramadhani Husna",
  ],
  "8B": [
    "Aisyah Zafirah Ghani", "Chaira alessia olivari", "Dia Almahyra Munandar", "Fathiyya Naura Khalisha", "Kayla Vania Rivelino", "Kayyisah Binbas Abdullah", "Kimberly Delova Yudha", "Maila Arina Agustin", "Raina Farisha Ariakirana", "Safira Nauli Siregar", "Suhailah", "Syakirah Sidqia Mahilah", "Tri Athifa Putri Kusuma",
  ],
  "9A": [
    "Aisyah Rahma Kamila", "Aisyah Zaahirah Ramadhani Riyadi", "Faiza Raidah Ashshabira", "Louiza Zivana Karasya", "Joanne Chen Valen", "Kafiya Faida Azmi", "Makayla Haura Radiasa", "Mikayla Defti Namiyah", "Nafisa Hanun Mufti", "Naura Qaireen Imtinan Binti Rahmatsyah", "Navilata Radhiti Kusumawardhani", "Nirmala Sopian", "Zhafira Putri Aryanti",
  ],
  "9B": [
    "Afreen Nafila Zatta Yumni Wibowo", "Aisya Adnina", "Almira Rahmadhisa Wargadipura", "Amira Syahla Adina Aulia", "Anna Luthfiyah Khansa", "Calistanindya Shafa Wardhana", "Faiza Andinar Mulia", "Khansa Kamila", "Lubna Malika Lu'lu", "Mutia Azkayra Althafunisa", "Nirvana sopian", "Puri Sabrina Gayatri", "Rozanah Al Atsariyah", "Zahra Nusaybah",
  ],
  "10 RPL": [
    "Adzkiya Naira Fardhanty", "Aisyah Imany", "Aliya Riany Putri", "Alya Nurmaliha Rachman", "Asiyah", "Azkia Nurhanifah Rosihin", "Ilma Nafia Pasya", "Khaira Andani Soeyatwoko", "Kharima Albany Abdullah", "Rumaysa Afiah Raihana", "R.A Tsabitah Annisa Salsabila", "Keyza Aulia Syifana", "Raisha Abigail Sabine",
  ],
  "10 DKV": [
    "Alfia Uzhma Abdullah", "Asya Nuzulul Rachmani", "Ayesha Zuema", "Faras Zahira Ghanimi", "Hana Syifa Salsabila", "Izzah Fakhirah", "Khansa Janeeta", "Mahaira Qurani Arsha", "Nabila Afiqah Yadwar", "Qaisara Aqeela Naura Kalvin", "Qulaibah Nadhifah", "Ratu Ainun", "Sri Dewi Saraswati", "Tsabita Zahwa Annisa",
  ],
  "11 RPL": [
    "Adzkia Amada Raissa", "Afifa Quisha Syakira", "Aisyah", "DINNA RAFIZA AZ ZAHRA", "ELMIRA HANANI", "Faiha Wanda Nabilah", "Fauza Alifa Zahra", "Kayyasa Azzahra", "KAYYISA MALIHAH KARIN", "KHALLISTA AGNYA SHALIHAH", "Mariska Thasya Alzena", "MUTIARA KHANSA ABDILLAH", "Najwa Naqiyya Azkal 'Azkia", "Nasywah Nabilah Harahap", "Queenshafa Rania Bilqis",
  ],
  "11 DKV": [
    "AISHA LANANAHDHAH MACHMUDI", "Aisha Latifa Ariadi", "ALMAYRA RAFIFA ELWIDODO", "Anjali Sakhi Zada Adhigana", "Asy syifa Ummu Hanifah", "AUDIA SILMI AVANI HSB", "Aura Cinta Arfani", "Daiva ashila pangukir", "Dian Anggita", "ELINA SYIFAUL QOLBY", "Khansa Humairo", "Luh Dayu Aqiarasya Hermawan", "NADINE MALCA ZAFIRA AS'AD", "Shaqeela Allya Jasmine Rofik", "Zaura Khay Lila", "ZHAFIRA QUINN HARA",
  ],
};

// IDs are independent of name formatting. Keep each original position stable.
export const STUDENTS: Student[] = Object.entries(roster).flatMap(([className, names]) => names.map((name, index) => ({ id: `${className.replaceAll(" ", "-").toLowerCase()}-${String(index + 1).padStart(2, "0")}`, name, className, level: /^[789]/.test(className) ? "SMP" : "SMK" })));
export const STUDENT_CLASSES = Object.keys(roster);
