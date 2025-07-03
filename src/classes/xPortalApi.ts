import axios, { AxiosInstance, AxiosResponse } from 'axios';

export class xPortalApi {
    protected accessToken: string;
    protected client: AxiosInstance;

    public constructor(accessToken: string) {
        this.accessToken = accessToken;
        this.client = axios.create({
            baseURL: 'https://api.xportal.com',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                //'Content-Type': 'application/json',
            },
        });
    }

    public async get<T>(url: string): Promise<AxiosResponse<T>> {
        return this.client.get<T>(url);
    }
}
