import { Injectable} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsRepository {
    constructor (private readonly prisma: PrismaService) {}

    async create(data: { name: string; slug: string; upstreamUrl: string; userId: string}) {
        return this.prisma.project.create({ data });
    }

    async findByIdAndUser(id: string, userId: string){
        return this.prisma.project.findFirst({
            where: { id, userId},
        })
    }

    async findAllByUser(userId: string){
        return this.prisma.project.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc'},
        })
    }

    async findBySlug(slug: string){
        return this.prisma.project.findUnique({ where: {slug} });
    }

    async update(id: string, data:{ name?: string; upstreamUrl?: string; slug?: string}){
        return this.prisma.project.update({ where: { id }, data});
    }

    async delete(id: string){
        return this.prisma.project.delete({ where: { id } });
    }
}