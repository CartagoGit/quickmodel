import 'reflect-metadata';
import { QModel } from '../src/quick.model';
import { Quick } from '../src/core/decorators/quick.decorator';
import { registerCoreTransformers } from '../src/transformers/bootstrap';

registerCoreTransformers();

interface IPost {
  id: number;
  title: string;
  createdAt: Date;
}

@Quick({
  createdAt: Date,
})
class Post extends QModel<IPost> {
  id!: number;
  title!: string;
  createdAt!: Date;
}

interface IUser {
  posts: IPost[];
}

@Quick({
  posts: Post,
})
class User extends QModel<IUser> {
  posts!: Post[];
}

console.log('=== METADATA DEBUG ===');
console.log('design:type for posts:', Reflect.getMetadata('design:type', User.prototype, 'posts'));
console.log('arrayElementClass for posts:', Reflect.getMetadata('arrayElementClass', User.prototype, 'posts'));

const user = new User({
  posts: [
    { id: 1, title: 'First', createdAt: new Date('2024-01-01') },
  ],
});

console.log('\n=== RESULT ===');
console.log('user.posts[0] instanceof Post:', user.posts[0] instanceof Post);
console.log('user.posts[0]:', user.posts[0]);
console.log('user.posts[0].constructor.name:', user.posts[0]?.constructor?.name);
