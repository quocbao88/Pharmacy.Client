import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Subject, throwError } from 'rxjs';
import { BackupComponent } from './backup.component';

describe('Database backup', () => {
  it('sends only one export request while a download is pending', () => {
    const pending = new Subject<Blob>();
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
    http.post.and.returnValue(pending);
    const component = new BackupComponent(http);
    component.download();
    component.download();
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(component.busy).toBeTrue();
    pending.complete();
  });

  it('downloads the returned archive and reports success', () => {
    const pending = new Subject<Blob>();
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
    http.post.and.returnValue(pending);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:test-backup');
    spyOn(HTMLAnchorElement.prototype, 'click');
    const component = new BackupComponent(http);
    component.download();
    pending.next(new Blob(['PGDMP']));
    pending.complete();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(component.busy).toBeFalse();
    expect(component.message).toContain('tải xuống');
  });

  it('shows the server error from a failed blob response and allows retry', async () => {
    const http = jasmine.createSpyObj<HttpClient>('HttpClient', ['post']);
    const errorBlob = new Blob();
    spyOn(errorBlob, 'text').and.returnValue(Promise.resolve(JSON.stringify({ error: 'Cần cấu hình Session pooler' })));
    http.post.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400,
      error: errorBlob })));
    const component = new BackupComponent(http);
    component.download();
    await Promise.resolve();
    expect(component.error).toBe('Cần cấu hình Session pooler');
    expect(component.busy).toBeFalse();
    component.download();
    expect(http.post).toHaveBeenCalledTimes(2);
  });
});
