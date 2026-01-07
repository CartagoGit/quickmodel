/**
 * @QType() Decorator - Ejemplo 4: Arrays y Colecciones
 * 
 * Demuestra el manejo avanzado de arrays (primitivos y modelos)
 * y operaciones con colecciones.
 */

import { QModel, QType, QInterface } from '../../../quick.model';

// ============================================
// 1. ARRAYS DE PRIMITIVOS
// ============================================

interface IPlaylist {
  id: string;
  name: string;
  tags: string[];
  ratings: number[];
  favorites: boolean[];
  playCount: bigint[];
  createdAt: Date;
}

class Playlist extends QModel<IPlaylist> implements QInterface<IPlaylist> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare tags: string[];

  @QType()
  declare ratings: number[];

  @QType()
  declare favorites: boolean[];

  @QType()
  declare playCount: bigint[];

  @QType()
  declare createdAt: Date;

  getAverageRating(): number {
    if (this.ratings.length === 0) return 0;
    return this.ratings.reduce((a, b) => a + b, 0) / this.ratings.length;
  }

  getTotalPlays(): bigint {
    return this.playCount.reduce((a, b) => a + b, 0n);
  }
}

const playlist = new Playlist({
  id: 'playlist-001',
  name: 'Coding Vibes',
  tags: ['electronic', 'focus', 'instrumental', 'ambient'],
  ratings: [5, 4, 5, 5, 4, 5, 3, 5, 4, 5],
  favorites: [true, true, false, true, true, false, true, false, true, true],
  playCount: [1200n, 850n, 2100n, 950n, 1800n, 600n, 1400n, 500n, 1600n, 2000n],
  createdAt: new Date('2024-01-01')
});

console.log('\n=== EJEMPLO 1: Arrays de Primitivos ===\n');
console.log('Playlist:', playlist.name);
console.log('Tags:', playlist.tags.join(', '));
console.log('Número de canciones:', playlist.ratings.length);
console.log('Rating promedio:', playlist.getAverageRating().toFixed(2));
console.log('Total de reproducciones:', playlist.getTotalPlays().toString());
console.log('Canciones favoritas:', playlist.favorites.filter(f => f).length);

// Verificar tipos de arrays
console.log('\n¿Arrays con tipos correctos?');
console.log('  tags es Array?:', Array.isArray(playlist.tags) ? '✅' : '❌');
console.log('  ratings es Array?:', Array.isArray(playlist.ratings) ? '✅' : '❌');
console.log('  playCount[0] es bigint?:', typeof playlist.playCount[0] === 'bigint' ? '✅' : '❌');

// Serializar y deserializar
const playlistData = playlist.toInterface();
const restoredPlaylist = new Playlist(playlistData);
console.log('\nDespués de serializar/deserializar:');
console.log('tags preservados?:', restoredPlaylist.tags.length === playlist.tags.length ? '✅' : '❌');
console.log('playCount[0] es bigint?:', typeof restoredPlaylist.playCount[0] === 'bigint' ? '✅' : '❌');

// ============================================
// 2. ARRAYS DE MODELOS - BLOG CON COMENTARIOS
// ============================================

interface IComment {
  id: string;
  author: string;
  text: string;
  likes: number;
  createdAt: Date;
}

class Comment extends QModel<IComment> implements QInterface<IComment> {
  @QType()
  declare id: string;

  @QType()
  declare author: string;

  @QType()
  declare text: string;

  @QType()
  declare likes: number;

  @QType()
  declare createdAt: Date;
}

interface IArticle {
  id: string;
  title: string;
  content: string;
  tags: string[];
  comments: IComment[];
  publishedAt: Date;
}

class Article extends QModel<IArticle> implements QInterface<IArticle> {
  @QType()
  declare id: string;

  @QType()
  declare title: string;

  @QType()
  declare content: string;

  @QType()
  declare tags: string[];

  @QType(Comment)
  declare comments: Comment[];

  @QType()
  declare publishedAt: Date;

  getTotalLikes(): number {
    return this.comments.reduce((sum, comment) => sum + comment.likes, 0);
  }

  getPopularComments(minLikes: number): Comment[] {
    return this.comments.filter(c => c.likes >= minLikes);
  }
}

const article = new Article({
  id: 'article-001',
  title: 'Introduction to TypeScript Decorators',
  content: 'Decorators are a powerful feature in TypeScript...',
  tags: ['typescript', 'decorators', 'programming'],
  comments: [
    {
      id: 'comment-001',
      author: 'Alice',
      text: 'Great article! Very helpful.',
      likes: 15,
      createdAt: new Date('2024-01-10T10:00:00Z')
    },
    {
      id: 'comment-002',
      author: 'Bob',
      text: 'Could you explain more about class decorators?',
      likes: 8,
      createdAt: new Date('2024-01-10T11:30:00Z')
    },
    {
      id: 'comment-003',
      author: 'Charlie',
      text: 'Excellent examples!',
      likes: 22,
      createdAt: new Date('2024-01-10T14:00:00Z')
    },
    {
      id: 'comment-004',
      author: 'Diana',
      text: 'Thanks for sharing!',
      likes: 5,
      createdAt: new Date('2024-01-11T09:00:00Z')
    }
  ],
  publishedAt: new Date('2024-01-10')
});

console.log('\n=== EJEMPLO 2: Arrays de Modelos ===\n');
console.log('Artículo:', article.title);
console.log('Tags:', article.tags.join(', '));
console.log('Número de comentarios:', article.comments.length);
console.log('Total de likes:', article.getTotalLikes());

console.log('\nComentarios populares (>= 10 likes):');
const popularComments = article.getPopularComments(10);
popularComments.forEach(comment => {
  console.log(`  "${comment.text}" - ${comment.author} (${comment.likes} likes)`);
  console.log(`    Es Comment?: ${comment instanceof Comment ? '✅' : '❌'}`);
});

// Serializar y deserializar
const articleData = article.toInterface();
const restoredArticle = new Article(articleData);
console.log('\nArtículo restaurado:');
console.log('comments[0] es Comment?:', restoredArticle.comments?.[0] instanceof Comment ? '✅' : '❌');
console.log('comments[0].createdAt es Date?:', restoredArticle.comments?.[0]?.createdAt instanceof Date ? '✅' : '❌');
console.log('getTotalLikes():', restoredArticle.getTotalLikes());

// ============================================
// 3. ARRAYS MULTIDIMENSIONALES Y MIXTOS
// ============================================

interface IMatrix {
  id: string;
  name: string;
  data: number[][];  // Array 2D
  metadata: Map<string, string[]>;  // Map con arrays
  timestamps: Date[];
}

class Matrix extends QModel<IMatrix> implements QInterface<IMatrix> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType()
  declare data: number[][];

  @QType()
  declare metadata: Map<string, string[]>;

  @QType()
  declare timestamps: Date[];

  getRows(): number {
    return this.data.length;
  }

  getCols(): number {
    return this.data[0]?.length || 0;
  }

  getSum(): number {
    return this.data.flat().reduce((sum, val) => sum + val, 0);
  }
}

const matrix = new Matrix({
  id: 'matrix-001',
  name: 'Sample Matrix',
  data: [
    [1, 2, 3, 4],
    [5, 6, 7, 8],
    [9, 10, 11, 12]
  ],
  metadata: new Map([
    ['authors', ['Alice', 'Bob', 'Charlie']],
    ['tags', ['math', 'data', 'analysis']],
    ['versions', ['1.0', '1.1', '2.0']]
  ]),
  timestamps: [
    new Date('2024-01-01'),
    new Date('2024-01-15'),
    new Date('2024-02-01')
  ]
});

console.log('\n=== EJEMPLO 3: Arrays Multidimensionales ===\n');
console.log('Matrix:', matrix.name);
console.log('Dimensiones:', `${matrix.getRows()} x ${matrix.getCols()}`);
console.log('Data:');
matrix.data.forEach((row, i) => {
  console.log(`  Fila ${i + 1}:`, row.join(', '));
});
console.log('Suma total:', matrix.getSum());

console.log('\nMetadata:');
matrix.metadata.forEach((values, key) => {
  console.log(`  ${key}:`, values.join(', '));
});

console.log('\nTimestamps:');
matrix.timestamps.forEach((ts, i) => {
  console.log(`  ${i + 1}. ${ts.toLocaleDateString()}`);
});

// Clonar
const clonedMatrix = matrix.clone();
console.log('\nMatrix clonada:');
console.log('data es array 2D?:', Array.isArray(clonedMatrix.data) && Array.isArray(clonedMatrix.data[0]) ? '✅' : '❌');
console.log('metadata es Map?:', clonedMatrix.metadata instanceof Map ? '✅' : '❌');
console.log('timestamps[0] es Date?:', clonedMatrix.timestamps[0] instanceof Date ? '✅' : '❌');
console.log('getSum():', clonedMatrix.getSum());

// ============================================
// 4. OPERACIONES CON ARRAYS DE MODELOS
// ============================================

interface ITask {
  id: string;
  title: string;
  priority: number;
  completed: boolean;
  dueDate: Date;
}

class Task extends QModel<ITask> implements QInterface<ITask> {
  @QType()
  declare id: string;

  @QType()
  declare title: string;

  @QType()
  declare priority: number;

  @QType()
  declare completed: boolean;

  @QType()
  declare dueDate: Date;
}

interface IProject {
  id: string;
  name: string;
  tasks: ITask[];
  createdAt: Date;
}

class Project extends QModel<IProject> implements QInterface<IProject> {
  @QType()
  declare id: string;

  @QType()
  declare name: string;

  @QType(Task)
  declare tasks: Task[];

  @QType()
  declare createdAt: Date;

  getPendingTasks(): Task[] {
    return this.tasks.filter(t => !t.completed);
  }

  getHighPriorityTasks(): Task[] {
    return this.tasks.filter(t => t.priority >= 8);
  }

  getOverdueTasks(): Task[] {
    const now = new Date();
    return this.tasks.filter(t => !t.completed && t.dueDate < now);
  }

  getCompletionRate(): number {
    const completed = this.tasks.filter(t => t.completed).length;
    return (completed / this.tasks.length) * 100;
  }
}

const project = new Project({
  id: 'proj-001',
  name: 'QuickModel v2.0',
  tasks: [
    {
      id: 'task-001',
      title: 'Implement @Quick() decorator',
      priority: 10,
      completed: true,
      dueDate: new Date('2024-01-10')
    },
    {
      id: 'task-002',
      title: 'Write documentation',
      priority: 8,
      completed: false,
      dueDate: new Date('2024-01-20')
    },
    {
      id: 'task-003',
      title: 'Add more examples',
      priority: 7,
      completed: false,
      dueDate: new Date('2024-01-25')
    },
    {
      id: 'task-004',
      title: 'Fix edge cases',
      priority: 9,
      completed: false,
      dueDate: new Date('2024-01-15')
    }
  ],
  createdAt: new Date('2024-01-01')
});

console.log('\n=== EJEMPLO 4: Operaciones con Arrays ===\n');
console.log('Proyecto:', project.name);
console.log('Total de tareas:', project.tasks.length);
console.log('Tasa de completación:', project.getCompletionRate().toFixed(1) + '%');

console.log('\nTareas pendientes:');
project.getPendingTasks().forEach(task => {
  console.log(`  - ${task.title} (Prioridad: ${task.priority})`);
});

console.log('\nTareas de alta prioridad (>= 8):');
project.getHighPriorityTasks().forEach(task => {
  const status = task.completed ? '✅' : '⏳';
  console.log(`  ${status} ${task.title} (${task.priority})`);
});

console.log('\nTareas vencidas:');
const overdueTasks = project.getOverdueTasks();
if (overdueTasks.length > 0) {
  overdueTasks.forEach(task => {
    console.log(`  ⚠️  ${task.title} (vencida el ${task.dueDate.toLocaleDateString()})`);
  });
} else {
  console.log('  ✅ No hay tareas vencidas');
}

export { Playlist, Comment, Article, Matrix, Task, Project };
