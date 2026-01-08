import 'reflect-metadata';
import { QModel } from '../src/quick.model';

interface IPost {
  id: number;
  title: string;
}

class Post extends QModel<IPost> {
  id!: number;
  title!: string;
}

interface IUser {
  posts: IPost[];
}

class User extends QModel<IUser> {
  posts!: Post[];
}

console.log('=== TypeScript Metadata (BEFORE @Quick) ===');
console.log('design:type for posts:', Reflect.getMetadata('design:type', User.prototype, 'posts'));
